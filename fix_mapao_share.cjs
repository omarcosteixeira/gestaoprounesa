const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add id to the motion.div wrapper of the card
const cardWrapperSearch = `            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-6 rounded-[2rem] border shadow-sm transition-all relative group flex flex-col gap-4",`;

const cardWrapperReplace = `            <motion.div
              id={\`mapao-card-\${entry.id}\`}
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-6 rounded-[2rem] border shadow-sm transition-all relative group flex flex-col gap-4 bg-white",`; // Added bg-white specifically to make sure the screenshot has a white background if needed, but it already says bg-white lower down.

code = code.replace(cardWrapperSearch, cardWrapperReplace);

// 2. Add share button before the edit button
const editBtnSearch = `                  {canEdit && (
                    <>
                      <button
                        onClick={() => {
                          setEditingEntry(entry);`;

const editBtnReplace = `                  <button
                    onClick={() => handleShareCard(entry.id, entry.curso || "Curso")}
                    className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                    title="Compartilhar via WhatsApp"
                  >
                    <Share2 size={14} />
                  </button>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => {
                          setEditingEntry(entry);`;

code = code.replace(editBtnSearch, editBtnReplace);

// 3. Add handleShareCard function inside MapaoAcademicoView
const functionSearch = `  const [filterTipoCurso, setFilterTipoCurso] = useState("");`; // Let's check where to put it
