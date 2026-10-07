import { LitElement, html } from 'lit'

class VegasCounter extends LitElement {
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
      <button class="counter" type="button" @click=${() => this.count++}>
        Count is ${this.count}
      </button>
    `
  }
}

customElements.define('vegas-counter', VegasCounter)
