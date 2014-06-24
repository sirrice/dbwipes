DBWipes
=======

Interactive browsing of a database + integration with Scorpion (if scorpion is installed).


## Pre-install instructions

    sudo apt-get install postgresql   # install postgresql 9+
    # set postgresql to accept localhost:5432 connections 
    createdb status
    createdb cache

## INSTALL

Manual install

    python setup.py install


PyPi install

    pip install dbwipes

## Setup example data

    setupdbwipes.sh

## Usage

DBSetup -- pre-compute attribute value distributions

    summarizedb.py <dbname>          # precompute attribute value distributions
    vi settings.py                   # specify your own dburl prefix.
    dbwipesserver.py <hostname/ip>   # runs on port 8111

Add new dataset:

    pip install dbtruck
    importmydata.py <table> <db> <datafile>
    fixnulls.py <db> <table>      # scorpion doesn't deal with nulls well, otherwise don't worry about this
    summarizedb.py <db> <table>   # precompute attribute value distributions



