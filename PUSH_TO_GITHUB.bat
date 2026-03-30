@echo off
echo ===========================================
echo  GitHub Push Helper for kyahoofinance
echo ===========================================
echo.

REM Check if already have remote
FOR /F "tokens=*" %%g IN ('git remote get-url origin 2^>nul') DO (SET HAS_REMOTE=%%g)

IF DEFINED HAS_REMOTE (
    echo Remote already exists: %HAS_REMOTE%
    goto PUSH
)

echo.
echo Step 1: Creating GitHub repository...

REM Try GitHub CLI first
WHERE gh >nul 2>&1
IF %ERRORLEVEL% == 0 (
    echo Found GitHub CLI. Creating repo...
    gh repo create kyahoofinance032926 --public --source=. --push
    IF %ERRORLEVEL% == 0 (
        echo Successfully created and pushed!
        goto DONE
    ) ELSE (
        echo GitHub CLI failed, falling back to HTTPS method...
    )
)

REM Manual setup
echo.
echo ===========================================
echo  MANUAL SETUP REQUIRED
echo ===========================================
echo.
echo Please follow these steps:
echo.
echo 1. Go to: https://github.com/new
echo 2. Repository name: kyahoofinance032926
echo 3. Choose Public or Private
echo 4. DO NOT check "Add README"
echo 5. Click "Create repository"
echo.
echo 6. Then run this file again.
echo.
echo OR if you already created the repo,
echo enter your GitHub username below:
echo.
set /p GHUSER="GitHub username: "
IF "%GHUSER%"=="" goto DONE

git remote add origin https://github.com/%GHUSER%/kyahoofinance032926.git
git branch -M main

:PUSH
echo.
echo Step 2: Pushing to GitHub...
git push -u origin main

IF %ERRORLEVEL% == 0 (
    echo.
    echo ===========================================
    echo  SUCCESS! Repository pushed to GitHub!
    echo ===========================================
) ELSE (
    echo.
    echo Push failed. You may need to authenticate.
    echo When prompted for password, use a Personal Access Token.
    echo Create one at: https://github.com/settings/tokens
)

:DONE
echo.
echo Press any key to exit...
pause >nul
