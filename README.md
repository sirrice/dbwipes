DBWipes
=======

Interactive browsing of a database + integration with Scorpion (if scorpion is installed).


## Pre-install instructions

    # install postgresql 9+
    sudo apt-get install postgresql-9.3   
    sudo apt-get install libpq-dev

    # set postgresql to accept localhost:5432 connections 
    vi <PGHOME>/postgres.conf
    # enable TCP connections
    # set PORT to 5432


    # create dbwipes databases
    createdb status
    createdb cache


## Install Directions

    sudo apt-get install python-pip 
    pip install virtualenv

    # setup a virtual environment
    mkdir env
    cd env
    virtualenv .

    # switch to using virtualenv binaries
    . ./bin/activate

    # Install it!
    #   If you experience pain installing numpy/scipy/matplotlib, 
    #   consider using enthought canopy
    #
    pip install scorpion
    pip install dbwipes


## Setup example data

    ./bin/setupdbwipes.sh

## Usage

Setup Settings 

    vi <python site-packages>/scorpionsql/settings.py       # specify your own dburl prefix.
    vi <python site-packages>/dbwipes/settings.py           # specify your own dburl prefix.


Add new dataset:

    # dbtruck helps import your data
    pip install dbtruck

    importmydata.py <table> <db name> <datafile>

    # Scorpion and DBWipes doesn't deal with nulls or quotes very well
    # Replace NULLs with surrogate values, and remove nested quotes
    fixnulls.py <db name> <table>                 

Precompute attribute value distributions

    summarizedb.py <db name> <table>     

Start the DBWipes server

    dbwipesserver.py --help
