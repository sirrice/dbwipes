DBWipes
=======

Interactive browsing of a database + integration with Scorpion (if scorpion is installed).


## Database Setup Instructions

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


## Setup virtual environment

Install pip and virtualenv if you want to make sure
dbwipes is installed in a self contained environment.
Otherwise feel free to skip

    sudo apt-get install python-pip 
    pip install virtualenv

setup a virtual environment

    mkdir <directory name>
    cd <directory name>
    virtualenv .

switch to using virtualenv binaries

    . ./bin/activate

## Installation

    #
    #   If you experience pain installing numpy/scipy/matplotlib, 
    #   consider using enthought canopy
    #
    pip install scorpion
    pip install dbwipes


## Quick Setup with Intel Dataset

The Scorpion paper and demo used the intel sensor dataset.  The following instructions helps reproduce the demo.

    # download the ddl containing the intel tables (180Mb)
    wget "https://www.dropbox.com/s/glutiyu2uju4ijq/intel.ddl?dl=0"

    # create the database
    createdb intel   

    # Load the database
    psql -f intel.ddl\?dl=0 intel


Now run the dbwipes server and go to the webpage

    dbwipesserver.py --debug --threaded

    # now go to localhost:8111

# Advanced Setup

## Setup

Load some sample data into the database

    cd <root of virtualenv directory>
    ./bin/setupdbwipes.sh


These settings tell scorpion and dbwipes how to connect to the
database.  If you have a default postgresql installation, you may
not need to edit these settings.

    vi <python site-packages>/scorpionsql/settings.py       # specify your own dburl prefix.
    vi <python site-packages>/dbwipes/settings.py           # specify your own dburl prefix.


## Usage

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
