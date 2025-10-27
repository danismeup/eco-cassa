#!/usr/bin/env node
// scripts/create-github-release.js
// Usage:
//   GITHUB_TOKEN=... node scripts/create-github-release.js --owner smeup --repo signmeup-client-electron-binaries --assets dist/latest.yml dist/signmeup-client-electron.Setup.1.0.2.exe dist/signmeup-client-electron.Setup.1.0.2.exe.blockmap --notes "release notes"
// If no assets passed, script will try to upload matching files from dist/

// Load environment variables from .env when present
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

function parseArgs() {
    const argv = process.argv.slice(2);
    const out = { assets: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--owner') out.owner = argv[++i];
        else if (a === '--repo') out.repo = argv[++i];
        else if (a === '--notes') out.notes = argv[++i];
        else if (a === '--title') out.title = argv[++i];
        else if (a === '--assets') {
            i++;
            // collect all remaining args that are not options as assets
            while (i < argv.length && !argv[i].startsWith('--')) {
                out.assets.push(argv[i++]);
            }
            i--;
        } else {
            // ignore unknown
        }
    }
    return out;
}

(async () => {
    try {
        const args = parseArgs();
        const rootPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
        const version = rootPkg.version;
        const tag = 'v' + version;
        const owner = args.owner || (rootPkg.build && rootPkg.build.publish && rootPkg.build.publish[0] && rootPkg.build.publish[0].owner) || 'smeup';
        const repo = args.repo || (rootPkg.build && rootPkg.build.publish && rootPkg.build.publish[0] && rootPkg.build.publish[0].repo) || 'signmeup-client-electron-binaries';
        const notes = args.notes || `Release ${tag}`;
        const title = args.title || tag;

        const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
        if (!token) throw new Error('GITHUB_TOKEN or GH_TOKEN environment variable is required');

        const octokit = new Octokit({ auth: token });

        // ensure release exists (create if not)
        let release;
        try {
            const { data } = await octokit.repos.getReleaseByTag({ owner, repo, tag });
            release = data;
            console.log('Found existing release for', tag);
        } catch (e) {
            if (e.status === 404) {
                console.log('Creating release', tag);
                const { data } = await octokit.repos.createRelease({
                    owner,
                    repo,
                    tag_name: tag,
                    name: title,
                    body: notes,
                    draft: false,
                    prerelease: false,
                });
                release = data;
            } else {
                throw e;
            }
        }

        // prepare assets: if none passed, attempt autodiscovery in dist/
        let assets = args.assets && args.assets.length ? args.assets : [];
        if (assets.length === 0) {
            const dist = path.join(process.cwd(), 'dist');
            if (fs.existsSync(dist)) {
                const files = fs.readdirSync(dist);
                // prefer latest.yml + files that contain the version string
                const candidates = files.filter(f => f.includes(version) || f === 'latest.yml');
                assets = candidates.map(f => path.join(dist, f));
            }
        }

        if (!assets || assets.length === 0) {
            console.warn('No assets to upload. Provide --assets or ensure dist/ has artifacts.');
            process.exit(0);
        }

        // upload each asset
        const uploadUrl = release.upload_url.replace('{?name,label}', '');
        for (const assetPath of assets) {
            if (!fs.existsSync(assetPath)) {
                console.warn('Asset not found, skipping:', assetPath);
                continue;
            }
            const name = path.basename(assetPath);
            // check if asset already exists (delete if present)
            try {
                const existing = await octokit.repos.listReleaseAssets({ owner, repo, release_id: release.id });
                const dup = existing.data.find(a => a.name === name);
                if (dup) {
                    console.log('Deleting existing asset with same name:', name);
                    await octokit.repos.deleteReleaseAsset({ owner, repo, asset_id: dup.id });
                }
            } catch (e) {
                // ignore
            }

            const data = fs.readFileSync(assetPath);
            console.log('Uploading', name);
            await octokit.repos.uploadReleaseAsset({
                url: uploadUrl,
                headers: {
                    'content-type': 'application/octet-stream',
                    'content-length': data.length,
                },
                name,
                data,
            });
            console.log('Uploaded', name);
        }

        console.log('Release done:', `${owner}/${repo} ${tag}`);
    } catch (err) {
        console.error('Error:', err.message || err);
        process.exit(1);
    }
})();