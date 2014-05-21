#!/usr/bin/env python
try:
    from setuptools import setup, find_packages
except ImportError:
    import ez_setup
    ez_setup.use_setuptools()
from setuptools import setup, find_packages
import summary

setup(name="summary",
      version=summary.__version__,
      description="summarize a database",
      license="MIT",
      author="Eugene Wu",
      author_email="eugenewu@mit.edu",
      url="http://github.com/sirrice/summary",
      include_package_data = True,      
      packages = find_packages(),
      package_dir = {'summary' : 'summary'},
      scripts = [
        'bin/summaryserver.py',
        'bin/summarizedb.py'
      ],
      #zip_safe = False,
      install_requires = ['flask', 'psycopg2', 'sqlalchemy'],
      keywords= "")
