phonegap plugin add cordova-plugin-console --save
phonegap plugin add cordova-plugin-crosswalk-webview --save
phonegap plugin add cordova-plugin-customurlscheme --variable URL_SCHEME=kidoju --save
phonegap plugin add cordova-plugin-device --save
phonegap plugin add cordova-plugin-dialogs --save
phonegap plugin add cordova-plugin-file --save
phonegap plugin add cordova-plugin-file-transfer --save
phonegap plugin add cordova-plugin-google-analytics --save
phonegap plugin add cordova-plugin-inappbrowser --save
phonegap plugin add cordova-plugin-network-information --save
REM phonegap plugin add cordova-plugin-secure-storage --save
phonegap plugin add cordova-plugin-splashscreen --save
phonegap plugin add cordova-plugin-statusbar --save
phonegap plugin add cordova-plugin-tts --save
phonegap plugin add cordova-plugin-whitelist --save
REM phonegap plugin add cordova-plugin-wkwebview-engine --save
REM There is an incompatibility between InAppBrowser and WkWebView that prevents
REM the loadstart event to be triggered in an oAuth flow if cordova-plugin-wkwebview-engine is installed
REM See https://issues.apache.org/jira/browse/CB-10698
REM See https://issues.apache.org/jira/browse/CB-11136
REM Seems to have been fixed in https://github.com/apache/cordova-plugin-inappbrowser/pull/187
REM Has yet to be released - see https://github.com/kidoju/Kidoju-Mobile/issues/34
phonegap plugin add cordova-plugin-x-socialsharing --save
phonegap plugin add phonegap-plugin-barcodescanner --variable CAMERA_USAGE_DESCRIPTION="To Scan QR Codes" --save

phonegap prepare
