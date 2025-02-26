import React from 'react';
import Page from './Page';

interface A4PageProps {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;

  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const A4Page: React.FC<A4PageProps> = ({ top, bottom, left, right, children, header, footer, }) => {

  return (
    <Page
      header={header}
      footer={footer}
      margins={{ top: top?? '0mm', right: right?? '15mm', bottom: bottom?? '0mm', left: left??'15mm' }}>
      {children} 
    </Page>
  );
};

export default A4Page;
