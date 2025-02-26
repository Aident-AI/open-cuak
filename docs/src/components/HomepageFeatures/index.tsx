import type {ReactNode} from 'react';
import Heading from '@theme/Heading';
import clsx from 'clsx';

import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Reliable & Scalable',
    Svg: require('@site/static/img/favicon.svg').default,
    description: (
      <>
        Open Cuak is designed to run and manage thousands of automation agents, ensuring each one is reliable.
      </>
    ),
  },
  {
    title: 'Easy to Use',
    Svg: require('@site/static/img/favicon.svg').default,
    description: (
      <>
        Open Cuak is designed to be easy to use, with a simple and intuitive interface.
      </>
    ),
  },
  {
    title: 'Open Source',
    Svg: require('@site/static/img/favicon.svg').default,
    description: (
      <>
        Open Cuak is open source, allowing you to self-host.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
