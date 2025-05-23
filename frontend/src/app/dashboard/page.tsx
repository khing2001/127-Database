'use client';

import Image from "next/image";
import { useEffect, useState } from "react";
import { CirclePlus } from 'lucide-react';

export default function Dashboard() {
  const [selected, setSelected] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const [ingredientCards, setIngredientCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newIngredient, setNewIngredient] = useState({
    name: '',
    quantity: '',
    type: ''
  });

  useEffect(() => {
  Promise.all([
    fetch('http://localhost:4000/ingredients').then(res => res.json()),
    fetch('http://localhost:4000/ingredients-stocks').then(res => res.json())
  ])
    .then(([ingredients, stocks]) => {
      console.log("Ingredients:", ingredients);
      console.log("Stocks:", stocks);

      // Map stock by IngredientID
      const stockMap = stocks.reduce((acc: any, stockItem: any) => {
        acc[stockItem.IngredientID] = stockItem;
        return acc;
      }, {});

      const enriched = ingredients.map((item: any) => {
        const stock = stockMap[item.IngredientID] || {};
        return {
          id: item.IngredientID,
          name: item.IngredientName,
          type: item.IngredientType,
          batchId: stock.OrderID || "N/A",
          quantity: stock.Quantity || 0,
          daysLeft: 3 // or pull from another source if needed
        };
      });

      setIngredientCards(enriched);
      setIsLoading(false);
    })
    .catch(err => {
      console.error('Failed to fetch ingredients or stocks:', err);
      setIsLoading(false);
    });
}, []);



  const getDayLabel = (days: number) => {
    if (days <= 0) return "Expired";
    return `${days} day${days === 1 ? '' : 's'} left`;
  };

  const getCardColor = (days: number) => {
    if (days <= 0) return "bg-gray-300";
    if (days <= 2) return "bg-red-300";
    if (days <= 4) return "bg-yellow-300";
    return "bg-green-300";
  };

  const getStatusStyle = (days: number) => {
    if (days <= 0) return { text: "text-gray-500", border: "border-gray-300" };
    if (days <= 2) return { text: "text-red-500", border: "border-red-500" };
    if (days <= 4) return { text: "text-[#A8B000]", border: "border-[#A8B000]" };
    return { text: "text-[#00B087]", border: "border-[#00B087]" };
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewIngredient(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch('http://localhost:4000/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          IngredientName: newIngredient.name,
          IngredientType: newIngredient.type,
          Unit: newIngredient.quantity
        })
      });

      if (!res.ok) throw new Error('Failed to add ingredient');

      const newRes = await fetch('http://localhost:4000/ingredients');
      const data = await newRes.json();
      const enriched = data.map((item: any) => ({
        ...item,
        name: item.IngredientName,
        type: item.IngredientType,
        batchId: item.BatchID || "N/A",
        quantity: item.Quantity || 0,
        daysLeft: item.DaysLeft || 3
      }));
      setIngredientCards(enriched);

      setIsModalOpen(false);
      setNewIngredient({ name: '', quantity: '', type: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredIngredients = ingredientCards.filter(ingredient =>
    filterType === "All" || ingredient.type === filterType
  );

  const toggleSelection = (index: number) => {
    setSelected(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading ingredients...</div>;
  }

  return (
    <>
      <div className="flex h-screen bg-gray-200 p-4 space-x-4">
        {/* Left Column */}
        <div className="w-1/2 bg-white rounded shadow p-4 flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Ingredients</h2>
            <button className="flex items-left mr-2" onClick={() => setIsModalOpen(true)}>
              <CirclePlus size={40} className="w-5 h-5 text-gray-700 group-hover:text-white" />
            </button>
          </div>

          {/* Filter Buttons */}
          <div className="flex space-x-2 mb-4">
            {["All", "Produce", "Dairy", "Spice", "Sweetener", "Meat", "Grain", "Sauce"].map(type => (
              <button
                key={type}
                onClick={() => {
                  setFilterType(type);
                  setSelected([]); // Reset selection on filter change
                }}
                className={`text-sm px-2 py-1 rounded ${filterType === type ? "underline text-black" : "text-gray-500"}`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Ingredient Cards */}
          <div className="space-y-2 overflow-y-auto pr-2 flex-1">
            {filteredIngredients.map((card, index) => {
              const color = getCardColor(card.daysLeft);
              const label = getDayLabel(card.daysLeft);
              return (
                <div
                  key={index}
                  className={`flex justify-between items-center p-3 rounded cursor-pointer ${color} ${selected.includes(index) ? "border-2 border-black" : ""}`}
                  onClick={() => toggleSelection(index)}
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(index)}
                      onChange={() => toggleSelection(index)}
                    />
                    <div>
                      <p className="font-bold">{card.name}</p>
                      <p className="text-xs">BatchID: {card.batchId} | Quantity: {card.quantity}</p>
                    </div>
                  </div>
                  <span className="text-sm">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1 space-y-4">
          {/* Optional: Highlight first selected ingredient at top */}
          {selected.length > 0 && (
            <div className="bg-white p-4 rounded shadow flex">
              <Image
                src="/ground-pork.png"
                alt={filteredIngredients[selected[0]]?.name}
                width={100}
                height={100}
                className="rounded"
              />
              <div className="ml-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold">{filteredIngredients[selected[0]]?.name}</h3>
                  <p className="text-sm">Batch ID: {filteredIngredients[selected[0]]?.batchId}</p>
                </div>
                <div className="mt-4 text-sm">
                  <p>Quantity: {filteredIngredients[selected[0]]?.quantity}</p>
                  <p>Type: {filteredIngredients[selected[0]]?.type}</p>
                  <p>Purchased Date: 5/12/2025</p>
                  <p>
                    Status:
                    <span className={`px-2 rounded ml-1 border ${getStatusStyle(filteredIngredients[selected[0]].daysLeft).text} ${getStatusStyle(filteredIngredients[selected[0]].daysLeft).border}`}>
                      {getDayLabel(filteredIngredients[selected[0]].daysLeft)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Box with Multiple Selected Items */}
          <div className="bg-white p-4 rounded shadow space-y-4">
            {selected.map(i => (
              <div key={i} className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{filteredIngredients[i].name}</p>
                  <p className="text-xs text-gray-500">Batch ID: {filteredIngredients[i].batchId} | Date: 5/22/2025</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="px-2 bg-gray-200 rounded">-</button>
                  <input className="w-12 text-center border border-gray-300 rounded" defaultValue={0} />
                  <button className="px-2 bg-gray-200 rounded">+</button>
                </div>
              </div>
            ))}

            <div className="mt-4 flex justify-end">
              <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded">
                {/* Confirm */}
              </button>
            </div>
          </div>
        </div>
      </div>

    {/* Modern Modal */}
    {isModalOpen && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-8 mx-4">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Add Ingredient</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
              <input
                type="text"
                name="name"
                value={newIngredient.name}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-600 transition"
                placeholder="Enter ingredient name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity</label>
              <input
                type="number"
                name="quantity"
                value={newIngredient.quantity}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-600 transition"
                placeholder="Enter quantity"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
              <select
                name="type"
                value={newIngredient.type}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-600 transition"
              >
                <option value="" disabled>
                  Select type
                </option>
                <option value="Meat">Meat</option>
                <option value="Dairy">Dairy</option>
                <option value="Produce">Produce</option>
                <option value="Grain">Grain</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition shadow-md"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )}

    </>
  );
}
