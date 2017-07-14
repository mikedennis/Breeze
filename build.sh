#!/bin/bash

# exit if error
set -o errexit

# define a few variables
app_output_name="breeze-$os_identifier-$arch-$configuration"
api_output_name="api-$os_identifier-$arch-$configuration"

echo "current environment variables:"
echo "OS name:" $TRAVIS_OS_NAME
echo "OS identifier:" $os_identifier
echo "Platform:" $os_platform
echo "Build directory:" $TRAVIS_BUILD_DIR
echo "Node version:" $TRAVIS_NODE_VERSION
echo "Architecture:" $arch
echo "Configuration:" $configuration
echo "App output name:" $app_output_name
echo "Api output name:" $api_output_name


dotnet --info

# Initialize dependencies
echo $log_prefix STARTED restoring dotnet and npm packages
cd $TRAVIS_BUILD_DIR/Breeze
git submodule init
git submodule update

dotnet restore -v m
cd $TRAVIS_BUILD_DIR/Breeze.UI

npm install
echo $log_prefix FINISHED restoring dotnet and npm packages

# dotnet build
echo $log_prefix running 'dotnet build'
cd $TRAVIS_BUILD_DIR/Breeze/src/Breeze.Daemon
dotnet build -c $configuration -v m 

echo $log_prefix running 'dotnet publish'
dotnet publish -c $configuration -v m -o $TRAVIS_BUILD_DIR/dotnet_out/$TRAVIS_OS_NAME

echo $log_prefix zipping results of 'dotnet publish' into $TRAVIS_BUILD_DIR/dotnet_out/$api_output_name.zip
mkdir -p $TRAVIS_BUILD_DIR/deploy/
cd $TRAVIS_BUILD_DIR/dotnet_out
zip -r $TRAVIS_BUILD_DIR/deploy/$api_output_name.zip $TRAVIS_OS_NAME/*

# node Build
cd $TRAVIS_BUILD_DIR/Breeze.UI
echo $log_prefix running 'npm run'
npm run build:prod

# node packaging
echo $log_prefix packaging breeze 
node package.js --platform=$os_platform --arch=$arch --path=$TRAVIS_BUILD_DIR/breeze_out

# copy api libs into app
echo $log_prefix copying the Breeze api into the app
mkdir -p $TRAVIS_BUILD_DIR/breeze_out/breeze-ui-$os_platform-$arch/resources/app/assets/daemon/
cp -r $TRAVIS_BUILD_DIR/dotnet_out/$TRAVIS_OS_NAME/* $TRAVIS_BUILD_DIR/breeze_out/breeze-ui-$os_platform-$arch/resources/app/assets/daemon/

# zip result
echo $log_prefix zipping the app into $TRAVIS_BUILD_DIR/breeze_out/$app_output_name.zip
cd $TRAVIS_BUILD_DIR/breeze_out
zip -r $TRAVIS_BUILD_DIR/deploy/$app_output_name.zip breeze-ui-$os_platform-$arch/*

#tests
echo $log_prefix running tests
dotnet test -c $configuration $TRAVIS_BUILD_DIR/Breeze/src/Breeze.Api.Tests/Breeze.Api.Tests.csproj -v m

            
echo $log_prefix FINISHED build

