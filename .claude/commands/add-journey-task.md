---
description: Add or change a 30-day journey task (content + validation), e.g. /add-journey-task "Giảng viên: dự giờ đồng nghiệp ngày 12"
---
Use the `content-architect` agent to add/modify this journey task: $ARGUMENTS
It must follow docs/JOURNEY_SPEC.md and DATA_MODEL.md (phase by dueDay, owner, tracks, required, steps, linked
guide/contact, verified:false). Then run the content validation test and the engine tests, and report the new
per-track task counts.
