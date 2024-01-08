# PCEX-Authoring Docker

## Run the App

- clone the repo: _`git clone https://github.com/mhassany-pitt/pcex-authoring.git`_
- in _`./docker`_ directory, 
  - create _`.env.production`_  from _`.env.production.example`_ (set a value for __SESSION_SECRET__)
  - create _`docker-compose.yml`_ from _`docker-compose.example.yml`_ (apply changes if required)
  - run _`docker-compose up`_ to spin up the containers
  - navigate to _`http://localhost:3000/#/login`_ (use _`admin@tmp.com`_ for the email and password)
