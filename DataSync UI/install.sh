#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              DataSync UI - Install Dependencies                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "▸ Project directory: $SCRIPT_DIR"
echo ""

echo "▸ Loading NVM..."
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    source "$NVM_DIR/nvm.sh"
    echo "   [OK] NVM loaded"
    
    echo "▸ Setting Node.js version..."
    nvm use node
    echo "   [OK] Node.js version set"
else
    echo "   [WARN] NVM not found, continuing with system Node.js"
fi
echo ""

BACKEND_FAILED=0
FRONTEND_FAILED=0

if [ -d "backend" ]; then
    echo "▸ Step 1/2: Installing backend dependencies..."
    cd backend
    
    if npm install; then
        echo "   [OK] Backend dependencies installed successfully"
    else
        echo "   [FAIL] Backend dependencies installation failed!"
        BACKEND_FAILED=1
    fi
    echo ""
    
    cd ..
else
    echo "▸ Step 1/2: Backend directory not found, skipping..."
    echo ""
fi

echo "▸ Step 2/2: Installing frontend dependencies..."
if npm install; then
    echo "   [OK] Frontend dependencies installed successfully"
else
    echo "   [FAIL] Frontend dependencies installation failed!"
    FRONTEND_FAILED=1
fi
echo ""

if [ $BACKEND_FAILED -eq 0 ] && [ $FRONTEND_FAILED -eq 0 ]; then
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                  INSTALLATION SUCCESSFUL                        ║"
    echo "╠════════════════════════════════════════════════════════════════╣"
    echo "║                                                                ║"
    echo "║  ► Backend dependencies: Installed                            ║"
    echo "║  ► Frontend dependencies: Installed                           ║"
    echo "║  ► Ready to run: npm run dev                                  ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    exit 0
else
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                  INSTALLATION FAILED                           ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    if [ $BACKEND_FAILED -eq 1 ]; then
        echo "▸ Backend installation failed"
    fi
    if [ $FRONTEND_FAILED -eq 1 ]; then
        echo "▸ Frontend installation failed"
    fi
    echo ""
    exit 1
fi

