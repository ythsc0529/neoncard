@echo off
echo ==============================================
echo NeonCard: Syncing Web Files to www folder...
echo ==============================================

:: Copying necessary folders and files to www
xcopy css www\css /E /I /Y
xcopy js www\js /E /I /Y
xcopy pic www\pic /E /I /Y
xcopy hao_pic www\hao_pic /E /I /Y
xcopy item_pic www\item_pic /E /I /Y
xcopy race_pic www\race_pic /E /I /Y
xcopy logo www\logo /E /I /Y
xcopy *.html www /Y
copy sw.js www\sw.js /Y
copy manifest.json www\manifest.json /Y

echo.
echo ==============================================
echo Sync Complete! Now you can run:
echo npx cap copy android
echo ==============================================
pause
