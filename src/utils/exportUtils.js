import html2canvas from 'html2canvas';

export async function captureBentoSnapshot(element, fileName) {
  try {
    const canvas = await html2canvas(element, { 
      useCORS: true, 
      scale: 2,
      logging: false,
      backgroundColor: null 
    });
    
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    return true;
  } catch (error) {
    console.error('PNG Export failed:', error);
    throw error;
  }
}
