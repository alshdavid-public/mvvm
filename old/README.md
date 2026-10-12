# MVVM / MVC Library

Supports React and Preact

# Usage

```bash
npm install git+https://github.com/alshdavid/mvvm.git#main

# To use React
npm install react @types/react

# To use Preact
npm install preact

# To use observables
npm install rxjs
```

_Note: Requires rspack/webpack configuration using the latest decorator spec_

```tsx
import { rx } from 'mvvm'
import { useViewModel } from 'mvvm/react'

export class AppViewModel {
  // The component will automatically 
  // render when this property is mutated
  @rx accessor message = ''
}

export function App({}) {
  const vm = useViewModel(AppViewModel)

  return (
    <div>
      <p>{vm.message}</p>
      <input 
          onChange={e => vm.message = e.target.value}
          value={vm.message} />    
    </div>
  )
}
```

# Dependency Injection

```tsx
// index.tsx
import { Provider } from 'mvvm/react'
import { FooService } from './foo-service.ts'
import { App } from './app.tsx'

const provider = new Provider();

provider.set(FooService, new FooService());

render(
  <Provider.Provider value={provider}>
    <App />
  </Provider.Provider>
)
```

```tsx
// foo-service.ts
import { rx } from 'mvvm'

export class FooService {
  @rx accessor message = ''
}
```

```tsx
// app.tsx
import { rx } from 'mvvm'
import { useViewModel, useInject } from 'mvvm/react'
import { FooService } from './foo-service.ts'

export class AppViewModel {
  fooService: FooService

  constructor(
    fooService: FooService
  ) {
    this.fooService = fooService
  }
}

export function App({}) {
  const fooService = useInject(FooService)
  const vm = useViewModel(AppViewModel, [fooService])

  return (
    <div>
      <p>{vm.message}</p>
      <input 
          onChange={e => vm.fooService.message = e.target.value}
          value={vm.fooService.message} />    
    </div>
  )
}
```

# Observables

Use `useAsync` to subscribe to an observable, equivalent to Angular's `| async` pipe syntax

```tsx
export class AppViewModel {
  counter: Observable<number>;
  counterpp: Observable<number>;

  constructor() {
    this.counter = interval(1000);
    this.counterpp = this.counter.pipe(map((i) => i + 1));
  }
}

export function App({}) {
  const vm = useViewModel(AppViewModel, []);

  return (
    <div>
      <p>Counter: {useAsync(vm.counter, -1)}</p>
      <p>Counter pp: {useAsync(vm.counterpp, 0)}</p>
    </div>
  );
}
```

# Forms

To simplify form usage, this library includes an implementation of Angular Forms

```tsx
import { TextField } from 'mvvm/forms'

const field = new TextField()

// This will emit when the value is updated
field.addEventListener('change', () => console.log(field.value))

// Update the value every 1 second
for (let i = 0; i < 10; i++) {
  field.update(`Value: ${i}`)
  await new Promise(res => setTimeout(res, 1000))
}
```

## Usage with ViewModel

### Input

```tsx
export class AppViewModel {
  @rx accessor text: TextField;

  constructor() {
    this.text = new TextField()
  }
}

export function App({}) {
  const vm = useViewModel(AppViewModel, []);

  return (
    <div>
      <p>{vm.text.value}</p>
      <input 
        type="text"
        value={vm.message.value}
        onInput={vm.message.fromEvent} />
    </div>
  );
}
```

### From event

```tsx
export class AppViewModel {
  @rx accessor text: TextField;

  constructor() {
    this.text = new TextField()
  }

  async onInit() {
    for (let i = 0; i < 10; i++) {
      field.update(`Value: ${i}`)
      await new Promise(res => setTimeout(res, 1000))
    }
  }
}

export function App({}) {
  const vm = useViewModel(AppViewModel, []);

  return (
    <div>
      <p>Message: {vm.text.value}</p>
    </div>
  );
}
```

### Validation (WIP)

```tsx
import { TextField } from 'mvvm/forms'

const field = new TextField({
  validation: [
    (value) => value.length >= 5
  ]
})

field.addEventListener('change', () => console.log({
  value: field.value,
  touched: field.touched,
  valid: field.valid,
}))

assert(field.value === "")
assert(field.valid === false)
assert(field.touched === false)

field.blur()
assert(field.value === "")
assert(field.valid === false)
assert(field.touched === true)

field.update("1234")
assert(field.value === "1234")
assert(field.valid === false)
assert(field.touched === true)

field.update("12345")
assert(field.value === "12345")
assert(field.valid === true)
assert(field.touched === true)
```

### Forms (WIP)

```tsx
import { FormGroup, TextField } from 'mvvm/forms'

const form = new FormGroup({
  username: new TextField({
    validation: [
      (value) => value.length >= 5
    ]
  })
})

form.addEventListener('change', () => console.log({
  value: form.field('username').value,
  touched: form.field('username').touched,
  valid: form.field('username').valid,
}))

assert(deepEqual(form.serialize(), {
  username: ""
}))

form.field('username').update("alshdavid")


assert(deepEqual(form.serialize(), {
  username: "alshdavid"
}))
```
