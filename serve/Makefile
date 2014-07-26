PACKAGE  = ui-common
TOPDIR   = $(PWD)
MOCHA    = $(TOPDIR)/node_modules/.bin/mocha

UGLIFY   = $(TOPDIR)/node_modules/.bin/uglifyjs
JSDUCK   := $(shell which jsduck)

DISTDIR      ?= ./dist
DISTLIB      ?= $(DISTDIR)/kbase.js
DOCSDIR      ?= $(DISTDIR)/docs
MINDISTLIB   ?= $(DISTDIR)/kbase.min.js

FILEORDER     = ./src/file-order.txt
SOURCES       = $(shell find ./src -name "*.js")
SOURCES      += $(FILEORDER)

all:
	@echo This Makefile is deprecated, please see README.deploy.

#all: test dist docs

init:
	@ npm install
	@ git submodule update --init
	@ mkdir -p $(DISTDIR)

ext/kbase-datavis/dist/datavis.js:
	@ cd ./ext/kbase-datavis && make dist MINIFY=0

dist-datavis: ext/kbase-datavis/dist/datavis.js

$(DOCSDIR)/index.html: $(SOURCES)
ifndef JSDUCK
	$(error JSDuck not found (install with `gem install jsduck`).)
endif
	@ $(JSDUCK) --builtin-classes --output $(DOCSDIR) \
		--exclude ./src/datavis.js -- ./src

docs: init $(DOCSDIR)/index.html

$(DISTLIB): $(SOURCES) ext/kbase-datavis/dist/datavis.js
	@ $(UGLIFY) `cat $(FILEORDER) | sed -e "s/\#.*//g" -e "s|^\.|./src|g"` \
		--beautify --output $(DISTLIB)

$(MINDISTLIB): $(DISTLIB)
	@ $(UGLIFY) $(DISTLIB) --comments --compress --mangle --output $(MINDISTLIB)

dist: init dist-datavis $(DISTLIB) $(MINDISTLIB) 

test: init
	@ $(MOCHA)

clean:
	@ rm -rf $(DISTLIB) $(MINDISTLIB)

dist-clean: clean
	@ rm -rf node_modules/
	@ rm -rf $(DOCSDIR)

.PHONY: all
