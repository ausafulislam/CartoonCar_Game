import { Check, Coins, Home, Lock, Magnet, Shield, Zap } from 'lucide-react'
import {
  CARS,
  UPGRADES,
  fmt,
  type CarDef,
  type SaveData,
  type UpgradeDef,
  type UpgradeId,
} from '../lib/gameData'
import { CoinPrice, clickSfx } from '../components/ui'

interface ShopProps {
  save: SaveData
  onBack: () => void
  onBuyCar: (car: CarDef) => void
  onSelectCar: (id: string) => void
  onBuyUpgrade: (up: UpgradeDef) => void
}

const UPGRADE_ICONS: Record<UpgradeId, typeof Magnet> = {
  magnet: Magnet,
  shield: Shield,
  tires: Zap,
}

export function ShopScreen({ save, onBack, onBuyCar, onSelectCar, onBuyUpgrade }: ShopProps) {
  return (
    <section className="panel-screen" aria-label="Shop">
      <header className="screen-header">
        <button type="button" className="header-back" onClick={() => { clickSfx(); onBack() }} aria-label="Back to home">
          <Home size={21} />
        </button>
        <h1>Shop</h1>
        <span className="header-coins"><Coins size={16} /> {fmt(save.coins)}</span>
      </header>

      <div className="scroll-area">
        <h2 className="section-title">Cars</h2>
        <div className="shop-grid">
          {CARS.map((car) => {
            const owned = save.ownedCars.includes(car.id)
            const selected = save.selectedCar === car.id
            return (
              <article key={car.id} className="shop-card">
                <div className="shop-card-img">
                  <img src={car.hero} alt={car.name} className={owned ? '' : 'locked-img'} draggable={false} />
                  {selected && <span className="mini-badge on"><Check size={12} /> Driving</span>}
                  {!owned && <span className="mini-badge"><Lock size={12} /> Locked</span>}
                </div>
                <h3>{car.name}</h3>
                <p className="shop-stats">Speed {car.speedStat} · Accel {car.accelStat} · Handling {car.handlingStat}</p>
                {selected ? (
                  <button type="button" className="shop-btn" disabled>Selected</button>
                ) : owned ? (
                  <button type="button" className="shop-btn blue" onClick={() => { clickSfx(); onSelectCar(car.id) }}>Select</button>
                ) : (
                  <button type="button" className="shop-btn orange" onClick={() => { clickSfx(); onBuyCar(car) }}>
                    Buy · <CoinPrice amount={car.price} />
                  </button>
                )}
              </article>
            )
          })}
        </div>

        <h2 className="section-title">Upgrades</h2>
        <div className="upgrade-list">
          {UPGRADES.map((up) => {
            const Icon = UPGRADE_ICONS[up.id]
            const owned = save.upgrades[up.id]
            return (
              <article key={up.id} className="upgrade-card">
                <span className="upgrade-icon"><Icon size={26} /></span>
                <div className="upgrade-info">
                  <h3>{up.name}</h3>
                  <p>{up.description}</p>
                </div>
                {owned ? (
                  <button type="button" className="shop-btn" disabled><Check size={15} /> Owned</button>
                ) : (
                  <button type="button" className="shop-btn orange" onClick={() => { clickSfx(); onBuyUpgrade(up) }}>
                    <CoinPrice amount={up.price} />
                  </button>
                )}
              </article>
            )
          })}
        </div>

        <p className="shop-note">
          Everything here is bought with coins you earn by playing — collecting coins, finishing
          levels, daily rewards and missions. No real money, ever.
        </p>
      </div>
    </section>
  )
}
