# put this file outside the pcex-authoring folder
# then use it to update the pcex-authoring and rebuild/run the docker containers
sudo rm -rf pcex-authoring
git clone https://github.com/mhassany-pitt/pcex-authoring.git
docker build --no-cache -t editor-ui-build ./pcex-authoring/editor-ui
docker run --rm -v ${PWD}/pcex-authoring/editor-ui:/app editor-ui-build
mkdir ./pcex-authoring/editor-services/public/
sudo cp -rf ./pcex-authoring/editor-ui/dist/editor-ui/browser/** ./pcex-authoring/editor-services/public/
sudo docker-compose build --no-cache
sudo docker-compose down
sudo docker-compose up -d
