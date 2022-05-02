// 实现真正的computed函数

const bucket = new WeakMap()
    // 重新定义bucket数据类型为WeakMap
    let activeEffect
    const effectStack = []

    // TODO: 增加options
    const effect = function (fn, options = {}) {
      // TODO: 我们目的是在key被读取的时候，找到当前副作用函数被存在哪些集合中
      const effectFn = function () {
        cleanup(effectFn)
        activeEffect = effectFn
        // TODO: 将当前的effect入栈处理
        effectStack.push(effectFn)
        // 得到返回值
        const res = fn()
        // 执行结束之后再出栈，并且将activeEffect指向上一个
        effectStack.pop()
        activeEffect = effectStack[ effectStack.length - 1 ]
        // 返回给外面使用
        return res
      }
      // 存储每一个依赖集合
      effectFn.deps = []
      effectFn.options = options
      // TODO: 以下是新增
      // 非懒执行才直接执行
      if (!options.lazy) {
        effectFn()
      }
      // 否则直接返回，给到外面调用
      return effectFn
    }

    // 清楚遗留的副作用函数
    // TODO: 新增
    function cleanup (effectFn) {
      for (let i = 0; i < effectFn.deps.length; i ++) {
        const deps = effectFn.deps[ i ]
        deps.delete(effectFn)
      }

      // 清除之后重置为0
      effectFn.deps.length = 0
    }

    function track (target, key) {
      // activeEffect无值意味着没有执行effect函数，无法收集依赖，直接return掉
      if (!activeEffect) {
        return
      }
      // 每个target在bucket中都是一个Map类型： key => effects
      let depsMap = bucket.get(target)
      // 第一次拦截，depsMap不存在，先创建联系
      if (!depsMap) {
        bucket.set(target, (depsMap = new Map()))
      }
      // 根据当前读取的key，尝试读取key的effects函数  
      let deps = depsMap.get(key)
      
      if (!deps) {
        // deps本质是个Set结构，即一个key可以存在多个effect函数，被多个effect所依赖
        depsMap.set(key, (deps = new Set()))
      }
      // 将激活的effectFn存进桶中
      deps.add(activeEffect)
      // TODO: 这样就方便在下次读取的时候直接从deps中删除effectFn副作用函数了
      // 从而让下次key更新的时候，不会执行effectFn函数
      activeEffect.deps.push(deps)
    }

    function trigger (target, key) {
      // 读取depsMap 其结构是 key => effects
      const depsMap = bucket.get(target)

      if (!depsMap) {
        return
      }
      // 真正读取依赖当前属性值key的effects
      // TODO: 新增
      const effects = depsMap.get(key)
      const effectsToRun = new Set()

      // TODO: 新增
      effects && effects.forEach((fn) => {
        if (fn !== activeEffect) {
          effectsToRun.add(fn)
        }
      })
      
      effectsToRun && effectsToRun.forEach((effectFn) => {
        if (effectFn.options.scheduler) {
          effectFn.options.scheduler(effectFn)
        } else {
          effectFn()
        }
      })
    }

    function reactive (state) {
      return new Proxy(state, {
        get (target, key) {
          const value = target[ key ]

          track(target, key)
          console.log(`get ${key}: ${value}`)
          return value
        },
        set (target, key, newValue) {
          console.log(`set ${key}: ${newValue}`)
          // 设置属性值
          target[ key ] = newValue

          trigger(target, key)
        }
      })
    }

    function computed (getter) {
      let value
      // 表示依赖的数据是否已经改变，需要重新计算
      let dirty = true
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
          // 手动处理追踪
          track(obj, 'value')

          return value
        }
      }

      return obj
    }

    const obj = reactive({
      foo: 1,
      bar: 2,
    })

    const sumRes = computed(() => obj.foo + obj.bar)
    
    effect(() => {
      console.log(sumRes.value)
    })

    // 修改obj的值，希望effect能执行
    obj.foo++
    obj.bar++