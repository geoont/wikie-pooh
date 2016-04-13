# Migration to Heroku and MongoDB

## Goals

Refactor existing code into completely cloud version with datastore in MongoDB.

## Actions

- [x] Create Heroku account
- [x] Create MLab account
- [x] Learn how to deploy an app on Heroku
- [x] Learn how to store graphs in MongoDB

## Essential Components

- [ ] Tool to manage mongo database `mongoman.js`
 - [ ] help
 - [ ] connection to mLab mongo with a token
 - [ ] list experiments with sizes/record counts
 - [ ] rm experiment
 - [ ] import sqlite database
  - [ ] * pull from pages
  - [ ] * pull from links
  - [ ] * create mongo record
  - [ ] * check resulting db
  - [ ] * check resulting db size
 - [ ] dump experiment
 - [ ] restore experiment
- [ ] create a structure of the express application for heroku
 - [ ] can I set app name to wikie-pooh3?
 - [ ] connection to database
 - [ ] default unguessable path opens experiment selector
- [ ] Experiment creation and selection
 - [ ] New experiment name
 - [ ] New experiment comment
 - [ ] Language
 - [ ] Selection from the list of existing experiments
 - [ ] Seed pages
- [ ] Use http://datatables.net instead of a regular HTML table
 - [ ] Implement paging
- [ ] Tool to backup mongo database

## Porting of existing features

- [ ] Page retrieve
- [ ] Page parse

## Features down the road

- [ ] Authentication (as a wrokaround hide behind unpublished URL path)
