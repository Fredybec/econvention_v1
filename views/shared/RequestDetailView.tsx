import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Role } from '../../types';
import { RequestDetailContent } from '../../components/shared/RequestDetailContent';
import { BackButton } from '../../components/shared/BackButton';

export const RequestDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isReviewMode = searchParams.get('mode') === 'review';
  const navigate = useNavigate();
  const { records, currentUser, showAlert, getNextRecordId } = useAppContext();
  const record = records.find(r => r.id === id);
  const isStudent = currentUser?.roles?.includes(Role.STUDENT);

  const handleActionSuccess = () => {
    if (!record) return;
    
    const nextId = getNextRecordId(record.id, record.status);
    if (nextId && !isStudent) {
      navigate(`/request/${nextId}${isReviewMode ? '?mode=review' : ''}`);
      showAlert("Suivant", "Action effectuée. Passage au dossier suivant.");
    } else {
      navigate(isStudent ? '/conventions' : '/dashboard');
    }
  };

  if (!record) return <div className="p-24 text-center font-bold uppercase tracking-[0.5em] opacity-20">Dossier introuvable</div>;

  return (
    <div className="min-h-screen bg-background pt-12 pb-48 md:pb-56">
      <div className="container mx-auto px-6 max-w-6xl space-y-6">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-2xl font-bold text-foreground">Détails du dossier {isReviewMode && <span className="text-primary opacity-50 ml-2">(Mode Revue)</span>}</h1>
        </div>
        <RequestDetailContent id={record.id} isReviewMode={isReviewMode} onActionSuccess={handleActionSuccess} />
      </div>
    </div>
  );
};
