import './style.css'
import { LitElement, html } from 'lit'
import litLogo from './assets/lit.svg'
import vegasLogo from './assets/vegas.webp'
import heroImg from './assets/hero.png'
import githubIcon from './assets/github.svg'

class VegasApp extends LitElement {
  static properties = {
    count: { state: true },
  }

  declare count: number

  constructor() {
    super()
    this.count = 0
  }

  createRenderRoot() {
    return this
  }

  render() {
    return html`
      <section id="center">
        <div class="hero">
          <img src=${heroImg} class="base" width="170" height="179" alt="">
          <img src=${litLogo} class="framework" alt="Lit logo">
          <img src=${vegasLogo} class="vegas" alt="Vegas logo">
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/client/main.ts</code> and save to test fast <code>FBR</code>
          </p>
        </div>
        <button class="counter" type="button" @click=${() => this.count++}>
          Count is ${this.count}
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
                <img src=${vegasLogo} class="logo" alt="">
                Explore Vegas
              </a>
            </li>
            <li>
              <a href="https://lit.dev/" target="_blank">
                <img src=${litLogo} class="button-icon" alt="">
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
                <img src=${githubIcon} class="button-icon" alt="">
                GitHub
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div class="ticks"></div>
      <section id="spacer"></section>
    `
  }
}

customElements.define('vegas-app', VegasApp)

document.querySelector<HTMLDivElement>('#root')!.append(document.createElement('vegas-app'))
