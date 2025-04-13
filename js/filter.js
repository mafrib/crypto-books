function filterBooks(data, query) {
    const q = query.toLowerCase();
    return data.filter(book =>
      book.Obra.toLowerCase().includes(q) ||
      book.Nome_Autor.toLowerCase().includes(q) ||
      book.Livraria.toLowerCase().includes(q)
    );
  }