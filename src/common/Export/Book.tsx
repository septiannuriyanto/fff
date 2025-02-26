import React from 'react';

interface BookProps {
  children: React.ReactNode;
}

const Book: React.FC<BookProps> = ({ children }) => {
  // Convert children to an array
  const pages = React.Children.toArray(children);

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center">
      <div className="w-full max-w-[210mm] overflow-x-auto font-serif"> {/* Use Tailwind custom font */}
        <div className="flex flex-col">
          {pages.map((page, index) => (
            <React.Fragment key={index}>
              {page} {/* Render the page */}
              {/* Add gap after each page except the last one */}
              {index < pages.length - 1 && <div className="h-[10mm]"></div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Book;
