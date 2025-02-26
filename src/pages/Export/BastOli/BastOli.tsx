import React from 'react';
import A4Page from '../../../common/Export/A4Page';
import Book from '../../../common/Export/Book';
import CoverInternal from '../BaReconcile/components/CoverInternal';
import BastOliPage1 from './BastOliPage1';

const BastOli = () => {
  return (
    <Book>
        {/* Cover Page */}
      <CoverInternal
      title='BAST Oli'
      periode='September 2024'
      />
      {/* First Page */}
      <BastOliPage1/>

      {/* Second Page */}
      <A4Page>
        <h1>Page 2 Content</h1>
        <p>This is the content for the second A4 page.</p>
      </A4Page>
    </Book>
  );
};

export default BastOli;
