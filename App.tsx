import React, { useState, useCallback, useMemo } from 'react';
import { BRITISH_POSTER_IDEAS, AUSTRALIAN_POSTER_IDEAS } from './constants';
import { PosterIdea, UploadedImage } from './types';
import { generatePoster, adjustPoster, upscalePoster } from './services/geminiService';
import { 
    UploadIcon, CheckIcon, CloseIcon, WandIcon, PosterIcon, BritishFlagIcon, 
    AustralianFlagIcon, UpscaleIcon, DownloadIcon, AdjustIcon 
} from './components/IconComponents';

const fileToDataUrl = (file: File): Promise<UploadedImage> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, dataUrl: result, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const Header: React.FC = () => (
  <header className="w-full text-center py-6 bg-[#5C4033] text-[#FCFBF4] shadow-lg">
    <h1 className="text-4xl md:text-5xl font-bold font-serif tracking-wider">WWI Poster Generator</h1>
    <p className="text-[#F1EEDC] mt-2 text-lg font-sans">See yourself in history's most iconic posters.</p>
  </header>
);

const ImageUploader: React.FC<{ onImageUpload: (image: UploadedImage) => void; uploadedImage: UploadedImage | null; }> = ({ onImageUpload, uploadedImage }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = useCallback(async (files: FileList | null) => {
    if (files && files[0]) {
      try {
        const imageData = await fileToDataUrl(files[0]);
        onImageUpload(imageData);
      } catch (error) {
        alert("Error processing image. Please try again.");
      }
    }
  }, [onImageUpload]);

  const handleDragEvents = (e: React.DragEvent<HTMLLabelElement>, dragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragging);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    handleDragEvents(e, false);
    handleFileChange(e.dataTransfer.files);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#FCFBF4] p-6 rounded-lg shadow-md border border-[#DCD3B8]">
      <h2 className="text-3xl font-bold font-serif text-[#3D2B1F] mb-4 text-center">Step 1: Upload Your Photo</h2>
      <p className="text-center text-[#5C4033] mb-6">For best results, use a clear, front-facing photo.</p>
      <label
        onDragEnter={e => handleDragEvents(e, true)}
        onDragOver={e => handleDragEvents(e, true)}
        onDragLeave={e => handleDragEvents(e, false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-52 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          isDragging ? 'border-[#B22222] bg-red-50' : 'border-[#A89F88] bg-[#F1EEDC] hover:bg-[#EAE0C8]'
        }`}
      >
        {uploadedImage ? (
          <div className="text-center">
            <img src={uploadedImage.dataUrl} alt="Preview" className="h-28 w-28 object-cover rounded-full mx-auto mb-3 border-4 border-white shadow-md" />
            <div className="flex items-center justify-center text-green-700 font-semibold">
              <CheckIcon className="w-6 h-6 mr-2" />
              <span>Image Ready!</span>
            </div>
            <span className="text-sm text-gray-600 mt-1">Choose a file to replace.</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <UploadIcon className="w-12 h-12 mb-3 text-gray-500" />
            <p className="mb-2 text-lg text-gray-600"><span className="font-semibold">Click to upload</span> or drag & drop</p>
            <p className="text-sm text-gray-500">PNG, JPG, or WEBP</p>
          </div>
        )}
        <input id="dropzone-file" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileChange(e.target.files)} />
      </label>
    </div>
  );
};

const PosterCard: React.FC<{ idea: PosterIdea; onSelect: (id: number) => void; isSelected: boolean; isDisabled: boolean; }> = ({ idea, onSelect, isSelected, isDisabled }) => (
    <div
        onClick={() => !isDisabled && onSelect(idea.id)}
        className={`group rounded-lg overflow-hidden shadow-lg border-4 transition-all duration-300 bg-[#FCFBF4] ${
            isSelected ? 'border-[#B22222] scale-105' : 'border-transparent'
        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-2xl hover:border-[#5C4033]'}`}
    >
        <div className="w-full h-40 flex items-center justify-center bg-[#F1EEDC] group-hover:bg-[#EAE0C8] transition-colors duration-300">
            <PosterIcon className="w-20 h-20 text-gray-400 group-hover:text-[#5C4033] transition-colors duration-300" />
        </div>
        <div className="px-6 py-4">
            <div className="font-bold text-xl mb-2 text-[#3D2B1F] font-serif">{idea.title}</div>
            <p className="text-[#5C4033] text-base">{idea.description}</p>
        </div>
    </div>
);

const LoadingModal: React.FC<{ isOpen: boolean; }> = ({ isOpen }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="text-center text-white">
        <div className="w-16 h-16 border-4 border-dashed border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        <h3 className="text-3xl mt-4 font-serif">Generating Your Poster...</h3>
        <p className="text-lg mt-2 font-sans">The AI is working its magic. This may take a moment.</p>
      </div>
    </div>
  );
};

const ResultModal: React.FC<{ image: string | null; onUpdateImage: (img: string) => void; onClose: () => void; uploadedImage: UploadedImage | null }> = ({ image, onUpdateImage, onClose, uploadedImage }) => {
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [showAdjustInput, setShowAdjustInput] = useState(false);
  const [adjustText, setAdjustText] = useState('');

  if (!image) return null;

  const handleAction = async (action: 'upscale' | 'adjust') => {
      if (!uploadedImage) return;
      setIsAdjusting(true);
      try {
          let result: string;
          if (action === 'upscale') {
              result = await upscalePoster(uploadedImage.base64, uploadedImage.mimeType);
          } else {
              if(!adjustText) return;
              result = await adjustPoster(uploadedImage.base64, uploadedImage.mimeType, adjustText);
              setShowAdjustInput(false);
          }
          onUpdateImage(result);
      } catch (error) {
          alert(`Failed to ${action} image. Please try again.`);
      } finally {
          setIsAdjusting(false);
      }
  };

  const ActionButton: React.FC<{ icon: React.ReactNode, text: string, onClick: () => void }> = ({ icon, text, onClick }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center space-y-1 text-[#3D2B1F] hover:text-[#B22222] transition-colors duration-200 group">
        <div className="p-3 bg-[#F1EEDC] rounded-full group-hover:bg-red-100">{icon}</div>
        <span className="font-semibold text-sm">{text}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#FCFBF4] rounded-lg shadow-2xl p-6 max-w-3xl w-full relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-[#B22222] transition-colors">
            <CloseIcon className="w-8 h-8"/>
        </button>
        <h2 className="text-3xl font-bold font-serif text-[#3D2B1F] mb-4 text-center">Your Masterpiece is Ready!</h2>
        <div className="relative mb-4">
            <img src={image} alt="Generated propaganda poster" className="w-full h-auto object-contain rounded-md max-h-[65vh]" />
            {isAdjusting && <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center"><div className="w-12 h-12 border-4 border-dashed border-[#5C4033] rounded-full animate-spin"></div></div>}
        </div>
        
        <div className="flex justify-center items-center space-x-8 mb-4">
             <ActionButton icon={<UpscaleIcon className="w-6 h-6"/>} text="Upscale" onClick={() => handleAction('upscale')} />
             <a href={image} download="wwi-poster.png" className="flex flex-col items-center justify-center space-y-1 text-[#3D2B1F] hover:text-[#B22222] transition-colors duration-200 group">
                <div className="p-3 bg-[#F1EEDC] rounded-full group-hover:bg-red-100"><DownloadIcon className="w-6 h-6"/></div>
                <span className="font-semibold text-sm">Download</span>
            </a>
             <ActionButton icon={<AdjustIcon className="w-6 h-6"/>} text="Adjust" onClick={() => setShowAdjustInput(!showAdjustInput)} />
        </div>

        {showAdjustInput && (
            <div className="mt-4 flex space-x-2">
                <input type="text" value={adjustText} onChange={e => setAdjustText(e.target.value)} placeholder="e.g., 'add a military hat' or 'make the background darker'" className="flex-grow p-2 border-2 border-[#A89F88] rounded-md focus:outline-none focus:ring-2 focus:ring-[#B22222]"/>
                <button onClick={() => handleAction('adjust')} className="bg-[#5C4033] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#3D2B1F] transition-colors">Submit</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [selectedPosterId, setSelectedPosterId] = useState<number | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'britain' | 'australia'>('britain');

  const handleImageUpload = useCallback((image: UploadedImage) => {
    setUploadedImage(image);
    setSelectedPosterId(null); 
  }, []);

  const handleGenerate = async () => {
    if (!uploadedImage || !selectedPosterId) {
      setError("Please upload an image and select a poster style first.");
      return;
    }
    const allPosters = [...BRITISH_POSTER_IDEAS, ...AUSTRALIAN_POSTER_IDEAS];
    const selectedPoster = allPosters.find(p => p.id === selectedPosterId);
    if (!selectedPoster) {
      setError("Invalid poster selection.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await generatePoster(uploadedImage.base64, uploadedImage.mimeType, selectedPoster.prompt);
      setGeneratedImage(result);
    } catch (err) {
      setError(`Generation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isGenerateDisabled = useMemo(() => !uploadedImage || !selectedPosterId || isLoading, [uploadedImage, selectedPosterId, isLoading]);
  const postersToShow = activeTab === 'britain' ? BRITISH_POSTER_IDEAS : AUSTRALIAN_POSTER_IDEAS;

  const handleCloseModal = () => {
    setGeneratedImage(null);
  };
  
  return (
    <div className="min-h-screen font-sans text-[#3D2B1F]">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        
        <section className="mb-12">
            <ImageUploader onImageUpload={handleImageUpload} uploadedImage={uploadedImage} />
        </section>

        <section className="mb-12">
            <h2 className="text-3xl font-bold font-serif text-[#3D2B1F] mb-6 text-center">Step 2: Choose a Poster Style</h2>
            <div className="flex justify-center mb-8 border-b-2 border-[#DCD3B8]">
              {([ 'britain', 'australia' ] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center space-x-3 px-6 py-3 font-semibold text-lg transition-all duration-300 border-b-4 -mb-0.5 ${
                    activeTab === tab 
                      ? 'border-[#B22222] text-[#3D2B1F]' 
                      : 'border-transparent text-gray-500 hover:border-red-300/50 hover:text-gray-800'
                  }`}
                >
                  {tab === 'britain' ? <BritishFlagIcon className="w-8 h-8 rounded-sm shadow" /> : <AustralianFlagIcon className="w-8 h-8 rounded-sm shadow" />}
                  <span>{tab === 'britain' ? "British" : "Australian"} Posters</span>
                </button>
              ))}
            </div>
            
             <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 transition-opacity duration-500 ${!uploadedImage ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                {postersToShow.map(idea => (
                    <PosterCard
                        key={idea.id}
                        idea={idea}
                        onSelect={id => setSelectedPosterId(id)}
                        isSelected={selectedPosterId === idea.id}
                        isDisabled={!uploadedImage}
                    />
                ))}
            </div>
        </section>

        <section className="text-center mb-8 p-8 bg-[#FCFBF4] rounded-lg shadow-md border border-[#DCD3B8]">
            <h2 className="text-3xl font-bold font-serif text-[#3D2B1F] mb-4">Step 3: Generate Your Poster</h2>
             <button
                onClick={handleGenerate}
                disabled={isGenerateDisabled}
                className="bg-[#B22222] text-white font-bold text-xl py-4 px-10 rounded-lg shadow-lg hover:bg-red-800 transition-all duration-300 transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center mx-auto"
            >
                <WandIcon className="w-6 h-6 mr-3"/>
                {isLoading ? "Generating..." : "Create My Poster!"}
            </button>
        </section>

         {error && (
            <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded relative max-w-3xl mx-auto" role="alert">
                <strong className="font-bold">An error occurred: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}
      </main>
      
      <LoadingModal isOpen={isLoading} />
      <ResultModal image={generatedImage} onUpdateImage={setGeneratedImage} onClose={handleCloseModal} uploadedImage={uploadedImage} />

      <footer className="text-center p-4 bg-[#5C4033] text-[#F1EEDC] mt-8">
          <p>Powered by Google Gemini. For entertainment purposes only.</p>
      </footer>
    </div>
  );
}