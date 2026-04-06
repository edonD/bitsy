"""
Generate architecture diagram as Python visualization
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

# Create figure
fig, ax = plt.subplots(1, 1, figsize=(16, 12))
ax.set_xlim(0, 10)
ax.set_ylim(0, 14)
ax.axis('off')

# Color scheme
color_data = '#E8F4F8'
color_process = '#FFF4E6'
color_model = '#F0E8FF'
color_api = '#E8F8E8'
color_user = '#FFE8E8'

def draw_box(ax, x, y, width, height, text, color, fontsize=10):
    """Draw a colored box with text"""
    box = FancyBboxPatch(
        (x - width/2, y - height/2), width, height,
        boxstyle="round,pad=0.1",
        edgecolor='black',
        facecolor=color,
        linewidth=2
    )
    ax.add_patch(box)
    ax.text(x, y, text, ha='center', va='center', fontsize=fontsize,
            weight='bold', wrap=True)

def draw_arrow(ax, x1, y1, x2, y2, label='', color='black'):
    """Draw an arrow between points"""
    arrow = FancyArrowPatch(
        (x1, y1), (x2, y2),
        arrowstyle='->', mutation_scale=20,
        color=color, linewidth=2
    )
    ax.add_patch(arrow)
    if label:
        mid_x, mid_y = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mid_x + 0.3, mid_y, label, fontsize=8,
                bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))

# ============================================================================
# LAYER 1: DATA COLLECTION (Top)
# ============================================================================

ax.text(5, 13.5, 'LAYER 1: DATA COLLECTION (Daily 6am)',
        ha='center', fontsize=14, weight='bold')

# LLM API Calls
draw_box(ax, 2, 12, 2, 1,
         'LLM API Calls\n100k/day\nCost: $30/day',
         color_data)

# Brand Signal Scraper
draw_box(ax, 5, 12, 2, 1,
         'Brand Signal\nScraper\n500 brands',
         color_data)

# Additional data sources
draw_box(ax, 8, 12, 2, 1,
         'Authority Data\nG2, Gartner,\nWikipedia',
         color_data)

# Arrows down
draw_arrow(ax, 2, 11.5, 2, 10.5, color='blue')
draw_arrow(ax, 5, 11.5, 5, 10.5, color='blue')
draw_arrow(ax, 8, 11.5, 8, 10.5, color='blue')

# ============================================================================
# LAYER 2: DATA STORAGE
# ============================================================================

ax.text(5, 10.2, 'LAYER 2: DATA STORAGE',
        ha='center', fontsize=14, weight='bold')

# Mention Records DB
draw_box(ax, 2, 9, 2, 1,
         'Mention Records DB\n{date, brand,\nmodel, mentioned}',
         color_data)

# Brand Signals DB
draw_box(ax, 5, 9, 2, 1,
         'Brand Signals DB\n{freshness, authority,\ndomain_auth, ...}',
         color_data)

# Authority Cache
draw_box(ax, 8, 9, 2, 1,
         'Authority Cache\nG2, Gartner,\nWikipedia status',
         color_data)

# Arrows down
draw_arrow(ax, 2, 8.5, 3.5, 7.5, color='green')
draw_arrow(ax, 5, 8.5, 5, 7.5, color='green')
draw_arrow(ax, 8, 8.5, 6.5, 7.5, color='green')

# ============================================================================
# LAYER 3: DATA ASSEMBLY
# ============================================================================

ax.text(5, 7.2, 'LAYER 3: DATA ASSEMBLY (7am)',
        ha='center', fontsize=14, weight='bold')

draw_box(ax, 5, 6.5, 3.5, 1,
         'Join Signals + Mentions\n45k samples × 8 features\nTrain: 30k (60 days)\nTest: 15k (30 days)',
         color_process)

draw_arrow(ax, 5, 6, 5, 5, color='purple')

# ============================================================================
# LAYER 4: MODEL TRAINING
# ============================================================================

ax.text(5, 4.7, 'LAYER 4: MODEL TRAINING',
        ha='center', fontsize=14, weight='bold')

draw_box(ax, 2, 4, 2, 0.8,
         'XGBoost Train\n100 trees, depth 4',
         color_model)

draw_box(ax, 5, 4, 2, 0.8,
         'Validate Test Set\nR² = 0.87\nRMSE = 2.1pp',
         color_model)

draw_box(ax, 8, 4, 2, 0.8,
         'Feature Importance\nFreshness: 0.34\nAuthority: 0.28',
         color_model)

# Arrows down
draw_arrow(ax, 2, 3.6, 2, 2.8, color='red')
draw_arrow(ax, 5, 3.6, 5, 2.8, color='red')
draw_arrow(ax, 8, 3.6, 8, 2.8, color='red')

# ============================================================================
# LAYER 5: MODEL CACHE
# ============================================================================

ax.text(5, 2.5, 'LAYER 5: CACHE',
        ha='center', fontsize=14, weight='bold')

draw_box(ax, 5, 1.8, 4, 0.8,
         'In-Memory Cache\nTrained Model + Metrics + Feature Importance\n(Reloaded daily at 7am)',
         color_model)

draw_arrow(ax, 5, 1.4, 5, 0.5, color='darkred')

# ============================================================================
# LAYER 6: USER REQUEST (REAL-TIME)
# ============================================================================

ax.text(0.5, -0.2, 'USER REQUEST (<100ms)',
        ha='left', fontsize=12, weight='bold')

# User input
draw_box(ax, 1.5, -0.8, 1.8, 0.6,
         'User Adjusts\nSliders',
         color_user, fontsize=9)

# HTTP request
draw_arrow(ax, 2.4, -0.8, 3.5, -0.5, 'HTTP POST', color='orange')

# Load model
draw_box(ax, 5, -0.5, 1.8, 0.6,
         'Load Cached\nModel',
         color_api, fontsize=9)

# Predict baseline
draw_arrow(ax, 5.9, -0.5, 6.5, -0.2, color='orange')
draw_box(ax, 7.5, -0.2, 1.8, 0.6,
         'Predict Baseline\n(current state)',
         color_api, fontsize=9)

# Predict scenario
draw_arrow(ax, 7.5, -0.8, 8.5, -1.2, color='orange')
draw_box(ax, 9.2, -1.5, 1.8, 0.6,
         'Predict Scenario\n(user changes)',
         color_api, fontsize=9)

# Calculate lift
draw_arrow(ax, 9.2, -1.8, 8, -2.2, color='orange')
draw_box(ax, 6.5, -2.5, 1.8, 0.6,
         'Calculate Lift +\nConfidence Bounds',
         color_api, fontsize=9)

# Feature importance
draw_arrow(ax, 6.5, -2.8, 5, -3.2, color='orange')
draw_box(ax, 3.5, -3.5, 1.8, 0.6,
         'Feature\nImportance',
         color_api, fontsize=9)

# ============================================================================
# LAYER 7: RESPONSE
# ============================================================================

ax.text(0.5, -4.2, 'RESPONSE',
        ha='left', fontsize=12, weight='bold')

draw_box(ax, 5, -4.8, 4, 0.8,
         'JSON: {lift, confidence_bounds,\nfeature_contributions}',
         color_user, fontsize=9)

# Back to frontend
draw_arrow(ax, 3, -4.8, 1.5, -5.3, 'HTTP 200', color='orange')

draw_box(ax, 1.5, -5.6, 1.8, 0.6,
         'Frontend\nDisplay Results',
         color_user, fontsize=9)

# ============================================================================
# LEGEND
# ============================================================================

ax.text(0.5, -6.8, 'Color Legend:', fontsize=11, weight='bold')

legend_items = [
    (color_data, 'Data Collection', 1.2),
    (color_process, 'Processing', 2.2),
    (color_model, 'Model Training', 3.2),
    (color_api, 'API/Prediction', 4.2),
    (color_user, 'User Interface', 5.2),
]

for color, label, x in legend_items:
    rect = mpatches.Rectangle((x - 0.1, -7.3), 0.2, 0.3,
                              facecolor=color, edgecolor='black', linewidth=1)
    ax.add_patch(rect)
    ax.text(x + 0.3, -7.15, label, fontsize=9, va='center')

# ============================================================================
# INFO BOXES
# ============================================================================

info_text = """
DAILY CYCLE:
6am  → LLM API calls + Signal scraping
7am  → Model training + Validation
↓ Cached in memory

USER CYCLE (<100ms):
1. User adjusts sliders
2. Load cached model
3. Predict: baseline + scenario
4. Calculate: lift + confidence
5. Return: JSON response

COST: $730/month
MARGIN: 92.6% at scale
"""

ax.text(0.2, -8.8, info_text, fontsize=8, family='monospace',
        bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.8),
        verticalalignment='top')

plt.tight_layout()
plt.savefig('bitsy_architecture.png', dpi=300, bbox_inches='tight')
print("✓ Saved: bitsy_architecture.png")

# Also save as PDF
plt.savefig('bitsy_architecture.pdf', bbox_inches='tight')
print("✓ Saved: bitsy_architecture.pdf")

plt.show()
