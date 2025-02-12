import cytoscape, { ElementDefinition, EventObject } from 'cytoscape';
// @ts-expect-error cytoscape-cose-bilkent does not have types
import coseBilkent from 'cytoscape-cose-bilkent';
import { useEffect, useState } from 'react';

export const GraphLayoutConfig = {
  name: 'cose-bilkent',
  nodeRepulsion: 20000, // Control the distance between nodes
  idealEdgeLength: 250, // Control the preferred length of edges between nodes
  edgeElasticity: 0.3, // Control the edge elasticity. Higher values make the edges stiffer, pulling connected nodes closer together
  nestingFactor: 0.1, // Control the compactness of nested structures (such as subgraphs or clusters)
  gravity: 0.1, // Affects how much nodes are pulled towards the center of the layout
  numIter: 2500, // Controls the number of iterations the layout algorithm will run
  padding: 100, // Padding adds space around the entire graph layout within the viewport
  fit: true, // Adjusts the viewport to fit the graph
  avoidOverlap: true, // Ensure nodes don’t overlap
  nodeDimensionsIncludeLabels: true, // Include labels in node dimensions
};

export const GraphStyleConfig: cytoscape.Stylesheet[] = [
  {
    selector: 'node',
    style: {
      width: 15,
      height: 15,
      label: 'data(label)',
      'text-wrap': 'wrap',
      'text-max-width': '80px',
      'font-size': '10px',
      color: '#ffffff', // Text color
    },
  },
  {
    selector: 'node[type = "Entity"]',
    style: {
      'background-color': '#228B22', // Dark green for Entity nodes
    },
  },
  {
    selector: 'node[type = "Finding"]',
    style: {
      'background-color': '#FF8C00', // Dark orange for Finding nodes
    },
  },
  {
    selector: 'node[type = "TextUnit"]',
    style: {
      'background-color': '#8B4513', // Dark brown for TextUnit nodes
    },
  },
  {
    selector: 'node[type = "Community"]',
    style: {
      'background-color': '#800080', // Dark purple for Community nodes
    },
  },
  {
    selector: 'node[type = "Document"]',
    style: {
      'background-color': '#B22222', // Dark red for Document nodes
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#0074D9',
      'target-arrow-color': '#0074D9',
      'target-arrow-shape': 'triangle',
    },
  },
];

interface Configs {
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  elements: ElementDefinition[];
  handleMouseEnter: (event: EventObject) => void;
  handleMouseLeave: () => void;
}

cytoscape.use(coseBilkent);

export function useCytoscapeInstance(configs: Configs) {
  const [cyState, setCyState] = useState<cytoscape.Core | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!configs.containerRef.current) return;

    setIsReady(false);
    if (cyState) {
      cyState.destroy();
      setCyState(null);
    }

    if (configs.elements.length < 1) {
      setIsReady(true);
      return;
    }

    const cy = cytoscape({
      container: configs.containerRef.current,
      elements: configs.elements,
      layout: GraphLayoutConfig,
      style: GraphStyleConfig,
    });
    cy.on('mouseover', 'node', configs.handleMouseEnter);
    cy.on('mouseout', 'node', configs.handleMouseLeave);

    setCyState(cy);
    setIsReady(true);

    return () => {
      if (!cyState) return;
      cyState.destroy();
      setCyState(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs.elements]);

  return { cy: cyState, isReady };
}
