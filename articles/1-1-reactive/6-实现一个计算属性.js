let bucket = new WeakMap()
let activeEffect = null
let effectStack = []

function effect (fn, options = {}) {
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn
    effectStack.push(activeEffect)
    const res = fn()
    effectStack.pop()
    activeEffect = effectStack[ effectStack.length - 1 ]

    return res
  }
  // 用来装一个个的Set，当这个effectFn被执行的时候，将其从中删除
  effectFn.deps = []
  effectFn.options = options

  if (!options.lazy) {
    effectFn()
  }

  return effectFn
}

function reactive (state) {
  return new Proxy(state, {
    get (target, key, ctx) {
      track(target, key)

      return Reflect.get(target, key, ctx)
    },
    set (target, key, value, ctx) {
      Reflect.set(target, key, value, ctx)
      trigger(target, key)
    }
  })
}

function track (target, key) {
  if (!activeEffect) {
    return
  }

  let depsMap = bucket.get(target)

  if (!depsMap) {
    bucket.set(target, depsMap = new Map())
  }

  let deps = depsMap.get(key)

  if (!deps) {
    depsMap.set(key, deps = new Set())
  }

  activeEffect && deps.add(activeEffect)
  activeEffect.deps.push(deps)
}

function trigger (target, key) {
  const depsMap = bucket.get(target)

  if (depsMap) {
    const effects = depsMap.get(key)
    const effectsToRun = new Set(effects)

    effectsToRun && effectsToRun.forEach((fn) => {
      // 关键代码
      if (fn !== activeEffect) {
        if (fn.options.scheduler) {
          fn.options.scheduler(fn)
        } else {
          fn()
        }
      }
    })
  }
}

function cleanup (effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[ i ]

    deps.delete(effectFn)
  }

  effectFn.deps.length = 0
}
/**
 * 1. 懒执行，在读取的时候才会进行第一次计算
 * 2. 依赖缓存，getter的数据没有发生变化不会重新计算
 * 3. 注意副作用函数嵌套
 */
function computed (getter) {
  let dirty = true
  let value
  const effectFn = effect(getter, {
    lazy: true,
    scheduler () {
      dirty = true
      trigger(obj, 'value')
    }
  })
  

  const obj = {
    get value () {
      if (dirty) {
        value = effectFn()
        dirty = false
      }

      track(obj, 'value')

      return value
    }
  }

  return obj
}

let data = {
  foo: 1,
  bar: 2
}
const obj = reactive(data)

const sum = computed(() => {
  return obj.foo + obj.bar
})

effect(() => {
  console.log(sum.value)
})

obj.foo++