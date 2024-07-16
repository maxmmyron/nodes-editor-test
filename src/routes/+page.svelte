<script lang="ts">
  // represent this in a manner that allows us to programmatically build out a tree of nodes
  // 1. list containing all nodes
  // 2. graph of nodes (how to get detached nodes if we find this via traversing)?

  // how do we represent connections in a data-driven way such that we maintain nice flow while
  // being able to generate visual??

  let graph: App.FilterGraph = {
    nodes: [],
    edges: [],
  };

  const connect = <
    T extends (args: any) => Record<string, any>,
    K extends keyof ReturnType<T>,
    U extends (args: any) => Record<string, any>,
    V extends keyof Parameters<U>[0],
  >(
    nodeA: App.Node<T>,
    keyA: K,
    nodeB: App.Node<U>,
    keyB: V
  ) => {
    graph.edges = [
      ...graph.edges,
      [
        { node: nodeA, key: keyA },
        { node: nodeB, key: keyB },
      ],
    ];
  };

  // let x: App.Node<({ x, y }: { x: number; y: number }) => { z: number }> = {
  //   transform: ({ x, y }) => ({ z: x * y }),
  //   out: { z: 0 },
  // };

  // let y: App.Node<({ a, b }: { a: number; b: number }) => { c: number }> = {
  //   uuid: Math.floor(Math.random() * 10000000).toString(36)
  //   transform: ({ a, b }) => ({ c: a + b }),
  //   out: { c: 0 },
  // };

  // connect(x, "z", y, "a");

  // on connect:

  let createNode = <T extends (args: any) => Record<string, any>>(
    transformFn: T,
    inputs: Parameters<T>[0],
    outputs: ReturnType<T>
  ): App.Node<T> => {
    let uuid = Math.floor(Math.random() * 10000000).toString(36);

    return {
      uuid,
      _transform: transformFn,
      inputs,
      outputs,
      transform: () => {
        let args: { [key: string]: any } = {};
        for (const param of Object.keys(inputs)) {
          let pair = graph.edges.find(
            ([_, rhs]) => rhs.node.uuid === uuid && rhs.key === param
          );
          if (!pair) {
            // set to default
            args[param] = inputs[param];
          } else {
            console.log(pair[0]);
            args[param] = pair[0].node.outputs[pair[0].key.toString()];
          }
        }

        let res = transformFn(args) as ReturnType<T>;

        // update outputs
        outputs = res;

        return res;
      },
    };
  };

  let v1Val = 1;
  let v2Val = 2;
  let v3Val = 3;

  // 1 + 2 = 3
  // value node: 1
  let v1 = createNode(() => ({ default: v1Val }), undefined, { default: 0 });

  // value node: 2
  let v2 = createNode(() => ({ default: v2Val }), undefined, { default: 0 });

  // sum node: 1 + 2
  const sum = createNode(
    ({ a, b }: { a: number; b: number }) => ({
      sum: a + b,
    }),
    { a: 0, b: 0 },
    { sum: 0 }
  );

  connect(v1, "default", sum, "a");
  connect(v2, "default", sum, "b");

  console.log(graph.edges);

  $: sumOut = sum.transform().sum;
  $: console.log(sumOut);

  // $: sumOut = sum.transform({
  //   a: v1.transform().default,
  //   b: v2.transform().default,
  // }).sum;

  // $: v3 = createNode(() => ({ default: v3Val }));

  // $: sumOut2 = sum.transform({ a: sumOut, b: v3.transform().default }).sum;
</script>

<!-- {sumOut} -- {sumOut2} -->
{sumOut}

<input type="range" min="0" max="20" bind:value={v1Val} />
<input type="range" min="0" max="20" bind:value={v2Val} />
<input type="range" min="0" max="20" bind:value={v3Val} />
