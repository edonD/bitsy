"""
Execute layer — turns gap-analysis output into a ready-to-ship playbook.

Each gap the Simulate step surfaces gets a five-section playbook:
  1. content_patch     — paste-ready paragraph (LLM-authored, evidence-backed)
  2. channels          — where to publish it (deterministic per feature)
  3. amplification     — who should cite you (derived from /cited-sources data)
  4. content_pairing   — other pages to build so the patch actually lands
  5. timing            — when to ship and how often to refresh

Every recommendation carries an `evidence` list of {claim, paper, url, finding}
so the user can click through to the research that backs each suggestion.
"""

from .evidence import EVIDENCE, find_evidence
from .playbook import build_playbook
from .blog_templates import TEMPLATES as BLOG_TEMPLATES, templates_for_feature

__all__ = [
    "EVIDENCE",
    "find_evidence",
    "build_playbook",
    "BLOG_TEMPLATES",
    "templates_for_feature",
]
