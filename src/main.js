import random from 'lodash/random'
import other from './other'

const FRUITS = ['🍏', '🍉', '🍇']

const FAST_FOODS = ['🍔', '🍟', '🍕', other]

const randomFruit = () =>
  FRUITS[random(0, FRUITS.length - 1)]

const randomFastFood = () =>
  FAST_FOODS[random(0, FRUITS.length - 1)]

export {
  FRUITS,
  FAST_FOODS,
  randomFruit,
  randomFastFood
}
