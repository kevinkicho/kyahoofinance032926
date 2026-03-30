# GitHub Push Helper - Double-click or right-click "Run with PowerShell"
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host " GitHub Push Helper for kyahoofinance      " -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check for Git
try {
    $gitVersion = git --version
    Write-Host "Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Git not found. Please install Git first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if already configured
$remote = git remote get-url origin 2>$null
if ($remote) {
    Write-Host "Remote already configured: $remote" -ForegroundColor Yellow
} else {
    # Check for GitHub CLI
    $gh = Get-Command gh -ErrorAction SilentlyContinue
    if ($gh) {
        Write-Host "GitHub CLI found! Creating repository..." -ForegroundColor Green
        try {
            gh repo create kyahoofinance032926 --public --source=. --push
            Write-Host "SUCCESS! Repository created and pushed!" -ForegroundColor Green
            Read-Host "Press Enter to exit"
            exit 0
        } catch {
            Write-Host "GitHub CLI failed, will use manual method..." -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "========== MANUAL SETUP NEEDED ==========" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please complete ONE of these options:"
    Write-Host ""
    Write-Host "OPTION 1 (Browser):" -ForegroundColor Cyan
    Write-Host "  1. Visit: https://github.com/new"
    Write-Host "  2. Repository name: kyahoofinance032926"
    Write-Host "  3. Choose Public or Private"
    Write-Host "  4. UNCHECK 'Add a README'"
    Write-Host "  5. Click Create repository"
    Write-Host ""
    Write-Host "OPTION 2 (Enter username now):" -ForegroundColor Cyan
}

$username = Read-Host "Enter your GitHub username (or leave blank if repo already exists)"

if ($username -and -not $remote) {
    git remote add origin "https://github.com/$username/kyahoofinance032926.git"
    git branch -M main
}

if ($remote -or $username) {
    Write-Host ""
    Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
    try {
        git push -u origin main
        Write-Host ""
        Write-Host "===========================================" -ForegroundColor Green
        Write-Host " SUCCESS! Repository pushed to GitHub!     " -ForegroundColor Green
        Write-Host "===========================================" -ForegroundColor Green
    } catch {
        Write-Host ""
        Write-Host "Push failed. Tip: When asked for password," -ForegroundColor Red
        Write-Host "use a Personal Access Token from:"
        Write-Host "https://github.com/settings/tokens" -ForegroundColor Cyan
    }
}

Write-Host ""
Read-Host "Press Enter to exit"
