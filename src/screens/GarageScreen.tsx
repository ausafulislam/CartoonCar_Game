import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Coins, Home, Lock } from 'lucide-react'
import { CARS, fmt, type CarDef, type SaveData } from '../lib/gameData'
import { CoinPrice, StatBar, clickSfx } from '../components/ui'

interface GarageProps {
  save: SaveData
  onBack: () => void
  onSelectCar: (id: string) => void
  onBuyCar: (car: CarDef) => void
}

export function GarageScreen({ save, onBack, onSelectCar, onBuyCar }: GarageProps) {
  const [index, setIndex] = useState(() => Math.max(0, CARS.findIndex((c) => c.id === save.selectedCar)))
  const car = CARS[index]
  const owned = save.ownedCars.includes(car.id)
  const selected = save.selectedCar === car.id
  const move = (dir: 1 | -1) => setIndex((i) => (i + dir + CARS.length) % CARS.length)

  return (
    <section className="panel-screen" aria-label="Garage">
      <header className="screen-header">
        <button type="button" className="header-back" onClick={() => { clickSfx(); onBack() }} aria-label="Back to home">
          <Home size={21} />
        </button>
        <h1>Garage</h1>
        <span className="header-coins"><Coins size={16} /> {fmt(save.coins)}</span>
      </header>

      <div className="garage-preview">
        <button type="button" className="cycle-btn" onClick={() => { clickSfx(); move(-1) }} aria-label="Previous car">
          <ChevronLeft size={26} />
        </button>
        <div className="garage-stage">
          <span className="car-shadow" aria-hidden="true" />
          <img key={car.id} src={car.hero} alt={car.name} className={`garage-car ${owned ? '' : 'locked-img'}`} draggable={false} />
          {!owned && <span className="lock-badge"><Lock size={17} /> Locked</span>}
          {selected && <span className="selected-badge"><Check size={16} /> Driving</span>}
        </div>
        <button type="button" className="cycle-btn" onClick={() => { clickSfx(); move(1) }} aria-label="Next car">
          <ChevronRight size={26} />
        </button>
      </div>

      <div className="garage-card">
        <h2>{car.name}</h2>
        <p className="tagline">{car.tagline}</p>
        <StatBar label="Top Speed" value={car.speedStat} />
        <StatBar label="Acceleration" value={car.accelStat} />
        <StatBar label="Handling" value={car.handlingStat} />
        {save.upgrades.tires && <p className="upgrade-note">Turbo Tires fitted: +8% speed &amp; steering.</p>}

        {selected ? (
          <button type="button" className="big-btn green" disabled>
            <Check size={20} /> Selected — ready to drive!
          </button>
        ) : owned ? (
          <button type="button" className="big-btn green" onClick={() => { clickSfx(); onSelectCar(car.id) }}>
            Drive this car
          </button>
        ) : (
          <button type="button" className="big-btn orange" onClick={() => { clickSfx(); onBuyCar(car) }}>
            Unlock for <CoinPrice amount={car.price} />
          </button>
        )}
      </div>

      <div className="car-thumbs" role="listbox" aria-label="All cars">
        {CARS.map((c, i) => {
          const isOwned = save.ownedCars.includes(c.id)
          return (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={i === index}
              className={`car-thumb ${i === index ? 'active' : ''}`}
              onClick={() => { clickSfx(); setIndex(i) }}
            >
              <img src={c.hero} alt={c.name} className={isOwned ? '' : 'locked-img'} draggable={false} />
              <span>{c.name}</span>
              {!isOwned && <span className="thumb-price"><Lock size={11} /> {fmt(c.price)}</span>}
              {save.selectedCar === c.id && <span className="thumb-check"><Check size={12} /></span>}
            </button>
          )
        })}
      </div>

      <p className="garage-tip">
        Tip: every car drives differently — higher Handling makes dodging traffic much easier.
        Turbo Tires from the Shop boost <em>every</em> car you own!
      </p>
    </section>
  )
}
