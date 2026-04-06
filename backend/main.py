"""
Bitsy Backend: Simulation Engine
Main entry point for FastAPI application
"""

import uvicorn
from api.app import create_app

# Create app at module level for uvicorn to import
app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
    )
