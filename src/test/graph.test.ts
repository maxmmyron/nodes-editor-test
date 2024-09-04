import { test, expect, it, describe } from "vitest";
import * as lib from "$lib";

const createEmptyNode = () => lib.createNode(() => ({}), undefined, {});

describe("graph instantiation", () => {
  it("succeeds with zero arguments", () => {
    const graph = lib.createGraph();

    expect(graph.edges.length).toBe(0);
    expect(graph.nodes.length).toBe(0);
  });

  it("succeeds with default node args", () => {
    const graph = lib.createGraph([createEmptyNode(), createEmptyNode()]);
    expect(graph.nodes.length).toBe(2);
  });

  it("succeeds with default node and edge args", () => {
    const nodeOut = lib.createNode(() => ({output: 1}), undefined, {output: 0});
    const nodeIn = lib.createNode((arg: {input: number}) => ({}), {input: 0}, {});
    const graph = lib.createGraph([nodeOut, nodeIn], [lib.createEdge(nodeOut, "output", nodeIn, "input")]);
    expect(graph.nodes.length).toBe(2);
  });

  it("fails when edge arg contains nodes that do not exist in the graph", () => {
    const nodeOut = lib.createNode(() => ({output: 1}), undefined, {output: 0});
    const nodeIn = lib.createNode((arg: {input: number}) => ({}), {input: 0}, {});

    // errors
    expect(() => lib.createGraph([], [lib.createEdge(nodeOut, "output", nodeIn, "input")])).toThrowError();
  });
});
