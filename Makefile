runargs = $(filter-out $@,$(MAKECMDGOALS))
ec =
ifeq ($(REMOTE), 1)
	ec = make ec
endif

.PHONY: default
default:
	poetry run uvicorn --port 8001 github_search:app

.PHONY: public_script
public_script:
	sed 's/localhost:8000/random-news-viewer.com:8000/' gm.js | sed 's/Github Expore+ (dev)/Github Expore+/' > public_greasemonkey_script.js
	sed 's/http:\/\/random-news-viewer.com:8000/\{\{ endpoint \}\}/' public_greasemonkey_script.js > templates/gm.js

.PHONY: build
build: public_script
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

.PHONY: spectre
spectre:
	test -d spectre || git clone https://github.com/picturepan2/spectre
	test -d spectre/node_modules/ || { cd spectre; npm install; }
	cd spectre && test "`git diff`" && git stash
	# namespace classes to rgv-
	find spectre/src/. -name *.scss | xargs sed -i -E 's/\.(\w+)(.*\{)/\.rgv-\1\2/g'
	# remove a stylings
	find spectre/src/. -name *.scss | xargs sed -i -E "s/(a(\s+\{|,$|:\w+\s+\{))/\.rgv-\1/g"
	cd spectre && gulp
	cp spectre/dist/spectre.min.css static
