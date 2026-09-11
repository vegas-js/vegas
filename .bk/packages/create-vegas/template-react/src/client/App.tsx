import { useState } from 'react'
import reactLogo from './assets/react.svg'
import vegasLogo from './assets/vegas.webp'
import heroImg from './assets/hero.png'
import githubIcon from './assets/github.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={vegasLogo} className="vegas" alt="Vegas" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test fast <code>FBR</code>
          </p>
        </div>
        <button
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vegasjs.dev/" target="_blank">
                <img className="logo" src={vegasLogo} alt="" />
                Explore Vegas
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
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
                <img src={githubIcon} className="button-icon" alt="" />
                GitHub
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
