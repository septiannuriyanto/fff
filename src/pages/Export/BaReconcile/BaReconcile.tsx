import React from 'react';
import A4Page from '../../../common/Export/A4Page';
import Book from '../../../common/Export/Book';

const BaReconcile = () => {
  return (
    <Book>
      {/* First Page */}
      <A4Page >
        <h1>Page 1 Content</h1>
        <p>This is the content for the first A4 page.</p>
      </A4Page>

      {/* Second Page */}
      <A4Page>
        <h1>Page 2 Content</h1>
        <p>This is the content for the second A4 page.</p>
      </A4Page>
    </Book>
  );
};

export default BaReconcile;
