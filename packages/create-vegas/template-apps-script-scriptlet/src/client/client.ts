const counter = document.querySelector<HTMLButtonElement>('#counter')

if (counter === null) {
  throw new Error('Counter button not found')
}

let count = Number(counter.dataset.count)

if (!Number.isFinite(count)) {
  count = 0
}

counter.addEventListener('click', () => {
  count += 1
  counter.textContent = `Count is ${count}`
})
