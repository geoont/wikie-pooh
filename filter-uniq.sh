#!/bin/bash

grep -v '^#' | cut -f1 | sort | uniq
