runargs = $(filter-out $@,$(MAKECMDGOALS))
ec =
ifeq ($(REMOTE), 1)
	ec = make ec
endif

.PHONY: build
build:
	poetry export -f requirements.txt -o requirements.txt
	poetry build

.PHONY: docker
docker: build
	docker build -t github_explore_plus .
	docker-compose up -d

.PHONY: deploy
deploy:
	bash deploy.sh

.PHONY: ec
ec:
	ssh -t runpython@45.79.214.62 $(runargs)
