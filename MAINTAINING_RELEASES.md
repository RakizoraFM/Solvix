# Maintaining Solvix releases

For each release:

1. Update NV.version in src/parts/core.js and fm-version in src/parts/head.html. Update the schema guard, provisioning check and relevant test fixtures when changing the database schema.
2. Review every entry in src/platform-guide.json. Add newly shipped capabilities and amend changed locations, instructions and audiences. Each entry needs id, name, what, where, route, steps, who and reviewed_in. Set the guide version and every reviewed_in to the current release only after reviewing the content.
3. Add the current version first in src/releases.json, recording actual changes, checks and limitations. Use passed, pending or not_run. A failed or incomplete check must not be represented as passed. Historical entries retain their original scope and limitations.
4. Run the appropriate tests and record results. Node unit tests and mocked interface tests do not replace PostgreSQL access tests or browser end-to-end checks.
5. Run Python on src/build.py --release. The build rejects stale guide/release versions, stale or incomplete feature entries and pending checks. It generates both index.html and PLATFORM_GUIDE_AR.md from the same guide source. Explicitly unexecuted checks may remain not_run with an explanation.
6. Include source, built output, migration and upgrade instructions in the delivery. Validate the database migration and login trigger in an isolated staging project before production deployment.

The JSON files are the maintained sources. Do not edit the generated guide or index.html directly. The release page contains packaged verification evidence; it is not a live environment health check.
