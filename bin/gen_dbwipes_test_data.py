#!/usr/bin/env python2.7
#
# Generate synthetic test data for user study
#
# shell commands:
#
#   python gendata.py --mode hard1  > simpledata.csv
#   importmydata.py simple test simpledata.csv 
#   summarizedb.py test simple
#
#


try:
  activate_this = './bin/activate_this.py'
  execfile(activate_this, dict(__file__=activate_this))
except:
  pass


import random
import click
import numpy as np
from collections import *
random.seed(0)
np.random.seed(0)


@click.command()
@click.argument('mode')
def gen_data(mode):
  # numeric attributes
  #  date, amount, age, state
  # discrete attributes
  #  
  states = ["AL",  "AK", "AZ", "AR", "CA", "CO", "CT", 
  "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", 
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", 
  "MO", "MT", "NE", "NV", "OH", "OK", "OR", "PA", "TN", 
  "TX", "UT", "VT", "VA", "WA", "WI", "WY"]

  ages = ['<18', '18-30', '30-50', '>60']

  state2ages = defaultdict(list)
  for state in states:
    sages = np.array([random.randint(1, 40) for age in ages]).astype(float)
    sages /= sages.sum()
    state2ages[state] = sages

  state2gender = {state: random.random() for state in states}


  print "day,state,age,gender,amt"
  for date in range(10):

    if mode == 'simple':
      states = ["AR", "CA", "CO", "IL",  "PA", "TN", "VT", "WA", "WI" ]

    # 5k sales per date
    for sidx, state in enumerate(states):

      
      #
      # Simple Version
      #
      # CA Males have more sales 
      # PA Females have higher sales
      # 
      if mode == 'simple':
        numcenter = 50
        numstd = 5
        amtcenter = 100
        amtstd = 5

        if state == 'CA':
          numcenter *= 0.88 * date
          amtcenter = 70


        state2gender['PA'] = 0.60
        state2gender['CA'] = 0.9

        nsales = max(0, int(random.gauss(numcenter, numstd)))
        agelist = np.random.choice(ages, nsales, p=state2ages[state])
        for i, age in enumerate(agelist):
          damtcenter = damtstd = 0
          male = random.random() < state2gender[state]
          gender = (male and 'Male' or 'Female')

          if state == 'PA' and gender == 'Female' and date >= 3:
            damtcenter += 35 * date
            damtstd = -amtstd + 3

          amt = max(0, random.gauss(amtcenter + damtcenter, amtstd+damtstd))
          #if state in ['CA', 'PA', 'OH']:
          print "%d,%s,%s,%s,%.2f" % (date, state, age, gender, amt)


      #
      # Hard version 1
      #
      # average of (40 + idx*2) +- 5 sales ~$10 each
      # CA has higher sales
      # MI has _more_ sales
      # FL have higher than average number and rate of sales 

      elif mode == 'hard1':
        numcenter = 40 + sidx*2
        numstd = 5
        amtcenter = 80 - sidx/2.
        amtstd = 5


        if date > 4:
          if state in ['CA', 'MI']:
            numcenter *= max(1, 1.15 * (date-4))

          if state == 'MI':
            amtcenter += 30
          if state == 'CA':
            amtcenter += 30
            amtstd += 5
          if state == 'FL':
            amtcenter *= 3

        nsales = max(0, int(random.gauss(numcenter, numstd)))
        agelist = np.random.choice(ages, nsales, p=state2ages[state])
        for i, age in enumerate(agelist):
          damtcenter = damtstd = 0
          if age == '>60':
            damtcenter += 50
          if age == '<18':
            damtstd += 5
            damtcenter += 20

          male = random.random() < state2gender[state]
          gender = (male and 'M' or 'F')

          amt = max(0, random.gauss(amtcenter + damtcenter, amtstd+damtstd))

          if state == 'FL':
            male = random.random() < 0.6
            gender = (male and 'M' or 'F')
            if gender == 'F':
              damtcenter = -amtcenter-50
            amt = random.gauss(amtcenter + damtcenter, amtstd+damtstd)

          print "%d,%s,%s,%s,%.2f" % (date, state, age, gender, amt)


      #
      # Hard version 2
      #
      # average of (40 + idx*2) +- 5 sales ~$10 each
      # MA >60 has higher sales
      # WA <18 has _more_ sales

      elif mode == 'hard2':
        numcenter = 20
        numstd = 3
        amtcenter = 50
        amtstd = 2


        if date >= 3 and date <= 6:
          if state in ['MA']:
            amtcenter *= max(1, 1.15 * (6 - abs(4-date)))

          #if state == 'MA':
            #amtcenter += 30
          if state == 'WA':
            numcenter += 20
            amtcenter += 60

        nsales = max(0, int(random.gauss(numcenter, numstd)))
        perc = np.array(list(state2ages[state]))
        if state == 'MA':
          perc[3] += .7
          perc = perc / perc.sum()
        if state == 'WA':
          perc[0] += .7
          perc = perc / perc.sum()


        agelist = np.random.choice(ages, nsales, p=perc)
        for i, age in enumerate(agelist):
          damtcenter = damtstd = 0
          male = random.random() < state2gender[state]
          gender = (male and 'M' or 'F')
          amt = max(0, random.gauss(amtcenter + damtcenter, amtstd+damtstd))

          print "%d,%s,%s,%s,%.2f" % (date, state, age, gender, amt)


if __name__ == '__main__':
  gen_data()
