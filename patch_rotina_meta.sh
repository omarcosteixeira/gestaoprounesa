#!/bin/bash
# We need to insert the weekly meta in App.tsx

# Find where to insert it in App.tsx
# In Rotina tab, above Acompanhamento de Meta Diária
# The code starts near 7900:
#      {activeMeta && (
#        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
#          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
#            <div>
#              <div className="flex items-center space-x-2 text-slate-900">
#                <Target size={20} className="text-blue-600" />
#                <h3 className="text-lg font-bold">
#                  Acompanhamento de Meta Diária
