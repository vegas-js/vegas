import { createSignal } from 'solid-js'
import solidLogo from './assets/solid.svg'
import vegasLogo from './assets/vegas.webp'
import heroImg from './assets/hero.png'
import githubIcon from './assets/github.svg'
import './App.css'

function App() {
  const [count, setCount] = createSignal(0)

  return (
    <>
      <section id="center">
        <div class="hero">
          <img src={heroImg} class="base" width="170" height="179" alt="" />
          <img src={solidLogo} class="framework" alt="Solid logo" />
          <img src={vegasLogo} class="vegas" alt="Vegas logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test fast <code>FBR</code>
          </p>
        </div>
        <button class="counter" onClick={() => setCount((count) => count + 1)}>
          Count is {count()}
        </button>
      </section>

      <div class="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vegasjs.dev/" target="_blank">
                <img class="logo" src={vegasLogo} alt="" />
                Explore Vegas
              </a>
            </li>
            <li>
              <a href="https://solidjs.com/" target="_blank">
                <img class="button-icon" src={solidLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <h2>Connect with us</h2>
          <p>Join the Vegas community</p>
          <ul>
            <li>
              <a href="https://github.com/vegas-js/vegas" target="_blank">
                <img class="button-icon" src={githubIcon} alt="" />
                GitHub
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div class="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
