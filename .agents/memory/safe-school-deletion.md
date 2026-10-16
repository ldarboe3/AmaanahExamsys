---
name: Safe school deletion
description: Safety boundary for administrative duplicate-school cleanup.
---

The user explicitly chose to allow super administrators to permanently delete a school and its linked records after explicit confirmation. Do not reinstate a blanket refusal based on students, invoices, accounts, or an automatically created center.

**Why:** The initial blanket safeguard made the requested duplicate-school deletion unusable; the user chose permanent deletion rather than merging after being warned about loss of linked records.

**How to apply:** Require explicit confirmation with a destructive-data warning. Delete only the selected school's records atomically, retain audit history, and protect other schools' records and shared identities/infrastructure. Authorization to build this feature is not authorization to select and delete an existing school on the user's behalf.
