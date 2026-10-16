---
name: Safe school deletion
description: Safety boundary for administrative duplicate-school cleanup.
---

Administrative duplicate-school deletion must refuse schools with linked business records or user accounts rather than silently deleting those dependencies.

**Why:** The request was to remove a duplicate school, not to erase students, examination history, financial records, or shared identities. The pre-existing general cleanup behavior was too destructive to expose directly in a row menu.

**How to apply:** Preserve this boundary in future school-menu changes. If a duplicate has dependencies, treat merging or transferring them as a separate explicitly approved operation; do not bypass the safeguard.
