import React from 'react';
import A4Page from '../../../common/Export/A4Page';
import Book from '../../../common/Export/Book';
import CoverInternal from '../BaReconcile/components/CoverInternal';

const BastFuel = () => {
  return (
    <Book>
      {/* Cover Page */}
      <CoverInternal
      title='BAST Fuel'
      periode='September 2024'
      />

      {/* First Page */}
      <A4Page>
        <h1>Page 1 Content</h1>
      </A4Page>
    </Book>
  );
};

export default BastFuel;
